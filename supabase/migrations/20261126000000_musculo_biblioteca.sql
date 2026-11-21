-- =====================================================================
-- Músculo de los ejercicios propios del gimnasio
-- * biblioteca_ejercicios.musculo: el músculo principal (mismos ids que el catálogo de la app). Sirve para que los
--   ejercicios que el gimnasio carga a mano también se cuenten en la figura del cuerpo del socio.
-- * Se completa solo en los ejercicios que ya tenían un grupo sin ambigüedad (Pecho, Hombros, Bíceps, Tríceps,
--   Glúteos, Abdominales y Espalda). "Piernas", "Cardio" y "Cuerpo completo" quedan sin asignar.
-- * guardar_ejercicio_biblioteca recibe el músculo (opcional) y _qr_perfil lo entrega al socio.
-- =====================================================================

alter table public.biblioteca_ejercicios
  add column musculo text check (musculo is null or musculo in ('pecho', 'dorsales', 'espalda_media', 'lumbares', 'trapecios', 'hombros', 'biceps', 'triceps', 'antebrazos', 'abdominales', 'cuadriceps', 'isquiotibiales', 'gluteos', 'pantorrillas', 'aductores', 'abductores', 'cuello'));

update public.biblioteca_ejercicios set musculo = case lower(trim(grupo))
  when 'pecho' then 'pecho'
  when 'espalda' then 'dorsales'
  when 'hombros' then 'hombros'
  when 'bíceps' then 'biceps'
  when 'biceps' then 'biceps'
  when 'tríceps' then 'triceps'
  when 'triceps' then 'triceps'
  when 'glúteos' then 'gluteos'
  when 'gluteos' then 'gluteos'
  when 'abdominales' then 'abdominales'
end
where musculo is null;

-- La función gana un cuarto parámetro: se reemplaza la de tres.
drop function public.guardar_ejercicio_biblioteca(text, text, text);

create function public.guardar_ejercicio_biblioteca(p_nombre text, p_grupo text, p_video text, p_musculo text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  yo perfiles := _yo();
  v_nombre text := trim(coalesce(p_nombre, ''));
  v_video text := trim(coalesce(p_video, ''));
  v_musculo text := nullif(trim(coalesce(p_musculo, '')), '');
  v_id uuid;
begin
  if yo.rol not in ('dueno', 'recepcionista') then raise exception 'SIN_PERMISO'; end if;
  if length(v_nombre) not between 2 and 80 then raise exception 'EJERCICIO_INVALIDO' using detail = 'El nombre del ejercicio tiene que tener entre 2 y 80 letras.'; end if;
  if not _video_valido(v_video) then raise exception 'EJERCICIO_INVALIDO' using detail = 'El enlace del video tiene que ser de YouTube o Vimeo (https).'; end if;
  if v_musculo is not null and v_musculo not in ('pecho', 'dorsales', 'espalda_media', 'lumbares', 'trapecios', 'hombros', 'biceps', 'triceps', 'antebrazos', 'abdominales', 'cuadriceps', 'isquiotibiales', 'gluteos', 'pantorrillas', 'aductores', 'abductores', 'cuello') then raise exception 'EJERCICIO_INVALIDO' using detail = 'Ese músculo no es válido.'; end if;
  insert into biblioteca_ejercicios (gym_id, nombre, grupo, video_url, musculo)
  values (yo.gym_id, v_nombre, left(trim(coalesce(p_grupo, '')), 40), v_video, v_musculo)
  on conflict (gym_id, lower(nombre)) do update
    set nombre = excluded.nombre, grupo = excluded.grupo, video_url = excluded.video_url, musculo = excluded.musculo
  returning id into v_id;
  return v_id;
end $$;

revoke execute on function public.guardar_ejercicio_biblioteca(text, text, text, text) from anon, public;
grant execute on function public.guardar_ejercicio_biblioteca(text, text, text, text) to authenticated;

-- Perfil del socio: ahora también trae el músculo de los ejercicios propios del gimnasio
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
        'id', m.id,
        'nombre', m.nombre,
        'descripcion', m.descripcion,
        'propia', m.propia,
        'del_gimnasio', m.publica,
        'hoy', case when c.nd > 0 then t.antes % c.nd else 0 end,
        'dias', coalesce((
          select json_agg(json_build_object(
            'nombre', d.nombre,
            'ejercicios', coalesce((
              select json_agg(json_build_object('nombre', e.nombre, 'series', e.series, 'repeticiones', e.repeticiones, 'descanso', e.descanso, 'nota', e.nota, 'video', e.video_url) order by e.orden)
              from rutina_ejercicios e where e.dia_id = d.id
            ), '[]'::json)
          ) order by d.orden)
          from rutina_dias d where d.rutina_id = m.id
        ), '[]'::json)
      ) order by m.publica, m.desde desc)
      from (
        select r.id, r.nombre, r.descripcion, sr.asignada_en as desde, false as propia, false as publica
        from socio_rutinas sr join rutinas r on r.id = sr.rutina_id and r.activo
        where sr.socio_id = s.id and r.socio_id is null
        union all
        select r.id, r.nombre, r.descripcion, r.created_at as desde, true as propia, false as publica
        from rutinas r where r.socio_id = s.id and r.activo
        union all
        select r.id, r.nombre, r.descripcion, r.created_at as desde, false as propia, true as publica
        from rutinas r
        where r.gym_id = s.gym_id and r.socio_id is null and r.para_todos and r.activo
          and not exists (select 1 from socio_rutinas sr where sr.socio_id = s.id and sr.rutina_id = r.id)
      ) m
      cross join lateral (select count(*)::int as nd from rutina_dias where rutina_id = m.id) c
      cross join lateral (
        select count(distinct (a.fecha at time zone g.zona_horaria)::date)::int as antes
        from asistencias a
        where a.socio_id = s.id and a.fecha >= m.desde
          and (a.fecha at time zone g.zona_horaria)::date < (now() at time zone g.zona_horaria)::date
      ) t
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
    -- Músculo de los ejercicios propios del gimnasio (los que no están en el catálogo de la app): la figura del cuerpo los cuenta.
    'biblioteca_musculos', coalesce((
      select json_agg(json_build_object('nombre', b.nombre, 'musculo', b.musculo) order by b.nombre)
      from biblioteca_ejercicios b where b.gym_id = s.gym_id and b.musculo is not null
    ), '[]'::json),
    'entrenamientos_30', (select count(*)::int from entrenamientos e where e.socio_id = s.id and e.finalizado_en > now() - interval '30 days'),
    'dni', case when length(coalesce(s.dni, '')) >= 4 then repeat('•', length(s.dni) - 3) || right(s.dni, 3) end,
    'telefono', case when length(v_tel) >= 4 then '•••• ' || right(v_tel, 4) end,
    'email', case when position('@' in coalesce(s.email, '')) > 1
                  then left(s.email, 1) || '•••@' || split_part(s.email, '@', 2) end
  );
end $$;
