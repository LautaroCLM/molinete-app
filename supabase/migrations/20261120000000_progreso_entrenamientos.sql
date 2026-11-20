-- =====================================================================
-- Progreso de entrenamientos
-- * El personal del gimnasio (dueño y recepción) puede LEER los entrenamientos de sus socios (ficha del socio).
-- * El socio ve su progreso por ejercicio (qr_progreso, con celular vinculado + PIN) y su racha semanal.
-- =====================================================================

create policy entrenamientos_select on public.entrenamientos for select using (gym_id = mi_gym());
create policy entrenamiento_series_select on public.entrenamiento_series for select using (gym_id = mi_gym());

-- Evolución por ejercicio: por cada sesión, el mejor peso y el mejor 1RM estimado (último año, máx. 40 sesiones)
create or replace function public.qr_progreso(p_token text, p_dispositivo uuid, p_pin text)
returns json language plpgsql security definer set search_path = public as $$
declare
  v json := _qr_auth_pin(p_token, p_dispositivo, p_pin);
  v_socio uuid;
begin
  if (v ->> 'ok')::boolean is not true then return v; end if;
  v_socio := (v ->> 'socio_id')::uuid;
  return json_build_object('ok', true, 'ejercicios', coalesce((
    select json_agg(json_build_object('nombre', t.nombre, 'puntos', t.puntos) order by t.sesiones desc, t.nombre)
    from (
      select (array_agg(x.ejercicio order by x.fecha desc))[1] as nombre,
             count(*) as sesiones,
             (select json_agg(json_build_object('fecha', y.fecha, 'peso', y.mp, 'e1rm', y.me) order by y.fecha)
              from (select z.fecha, z.mp, z.me from (
                      select e2.finalizado_en as fecha, max(es2.peso) as mp, max(es2.e1rm) as me
                      from entrenamiento_series es2 join entrenamientos e2 on e2.id = es2.entrenamiento_id
                      where es2.socio_id = v_socio and lower(es2.ejercicio) = x.k and e2.finalizado_en > now() - interval '1 year'
                      group by e2.id, e2.finalizado_en) z
                    order by z.fecha desc limit 40) y) as puntos
      from (
        select lower(es.ejercicio) as k, min(es.ejercicio) as ejercicio, e.finalizado_en as fecha
        from entrenamiento_series es join entrenamientos e on e.id = es.entrenamiento_id
        where es.socio_id = v_socio and e.finalizado_en > now() - interval '1 year'
        group by lower(es.ejercicio), e.id, e.finalizado_en
      ) x
      group by x.k
      order by count(*) desc limit 30
    ) t
  ), '[]'::json));
end $$;

grant execute on function public.qr_progreso(text, uuid, text) to anon, authenticated;

-- Perfil del socio: suma la racha semanal
create or replace function public._qr_perfil(p_socio uuid)
returns json language plpgsql security definer set search_path = public as $$
declare
  s socios;
  g gyms;
  pl planes;
  v_tel text;
  v_racha int := 0;
  v_sem date;
begin
  select * into s from socios where id = p_socio;
  select * into g from gyms where id = s.gym_id;
  select * into pl from planes where id = s.plan_id;
  v_tel := regexp_replace(coalesce(s.telefono, ''), '\D', '', 'g');

  -- Racha: semanas seguidas (lunes a domingo) con al menos una asistencia, contando hacia atrás.
  v_sem := date_trunc('week', now() at time zone g.zona_horaria)::date;
  if not exists (select 1 from asistencias a where a.socio_id = s.id
                 and (a.fecha at time zone g.zona_horaria)::date >= v_sem and (a.fecha at time zone g.zona_horaria)::date < v_sem + 7) then
    v_sem := v_sem - 7;
  end if;
  while v_racha < 520 and exists (select 1 from asistencias a where a.socio_id = s.id
                 and (a.fecha at time zone g.zona_horaria)::date >= v_sem and (a.fecha at time zone g.zona_horaria)::date < v_sem + 7) loop
    v_racha := v_racha + 1;
    v_sem := v_sem - 7;
  end loop;

  return json_build_object(
    'ok', true,
    'socio_id', s.id,
    'nombre', s.nombre,
    'apellido', s.apellido,
    'plan', pl.nombre,
    'plan_tipo', pl.tipo,
    'vencimiento', s.vencimiento,
    'clases_restantes', s.clases_restantes,
    'dias_gracia', g.dias_gracia,
    'fecha_alta', s.fecha_alta,
    'asistencias', coalesce((
      select json_agg(x.fecha order by x.fecha desc)
      from (select a.fecha from asistencias a
            where a.socio_id = s.id and a.fecha > now() - interval '120 days'
            order by a.fecha desc limit 200) x
    ), '[]'::json),
    'pagos', coalesce((
      select json_agg(json_build_object('fecha', y.fecha, 'plan', y.plan, 'hasta', y.hasta) order by y.fecha desc)
      from (select pg.fecha, pp.nombre as plan, pg.vencimiento_hasta as hasta
            from pagos pg
            join movimientos mv on mv.id = pg.movimiento_id
            left join planes pp on pp.id = pg.plan_id
            where pg.socio_id = s.id and mv.anulado_at is null
            order by pg.fecha desc limit 6) y
    ), '[]'::json),
    'rutinas', coalesce((
      select json_agg(json_build_object(
        'id', r.id,
        'nombre', r.nombre,
        'descripcion', r.descripcion,
        'hoy', case when c.nd > 0 then t.antes % c.nd else 0 end,
        'dias', coalesce((
          select json_agg(json_build_object(
            'nombre', d.nombre,
            'ejercicios', coalesce((
              select json_agg(json_build_object('nombre', e.nombre, 'series', e.series, 'repeticiones', e.repeticiones, 'descanso', e.descanso, 'nota', e.nota) order by e.orden)
              from rutina_ejercicios e where e.dia_id = d.id
            ), '[]'::json)
          ) order by d.orden)
          from rutina_dias d where d.rutina_id = r.id
        ), '[]'::json)
      ) order by sr.asignada_en desc)
      from socio_rutinas sr
      join rutinas r on r.id = sr.rutina_id and r.activo
      cross join lateral (select count(*)::int as nd from rutina_dias where rutina_id = r.id) c
      cross join lateral (
        select count(distinct (a.fecha at time zone g.zona_horaria)::date)::int as antes
        from asistencias a
        where a.socio_id = s.id and a.fecha >= sr.asignada_en
          and (a.fecha at time zone g.zona_horaria)::date < (now() at time zone g.zona_horaria)::date
      ) t
      where sr.socio_id = s.id
    ), '[]'::json),
    'entrenamientos', coalesce((
      select json_agg(json_build_object(
        'fecha', z.finalizado_en, 'rutina', z.rutina_nombre, 'dia', z.dia_nombre, 'series', z.series, 'volumen', z.volumen, 'records', z.records
      ) order by z.finalizado_en desc)
      from (select e.finalizado_en, e.rutina_nombre, e.dia_nombre,
                   count(es.id)::int as series,
                   coalesce(sum(coalesce(es.peso, 0) * coalesce(es.repeticiones, 0)), 0)::int as volumen,
                   count(*) filter (where es.es_record)::int as records
            from entrenamientos e
            join entrenamiento_series es on es.entrenamiento_id = e.id
            where e.socio_id = s.id
            group by e.id
            order by e.finalizado_en desc limit 8) z
    ), '[]'::json),
    'racha_semanas', v_racha,
    'entrenamientos_30', (select count(*)::int from entrenamientos e where e.socio_id = s.id and e.finalizado_en > now() - interval '30 days'),
    'dni', case when length(coalesce(s.dni, '')) >= 4 then repeat('•', length(s.dni) - 3) || right(s.dni, 3) end,
    'telefono', case when length(v_tel) >= 4 then '•••• ' || right(v_tel, 4) end,
    'email', case when position('@' in coalesce(s.email, '')) > 1
                  then left(s.email, 1) || '•••@' || split_part(s.email, '@', 2) end
  );
end $$;
