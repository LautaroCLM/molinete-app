-- =====================================================================
-- Rutinas del gimnasio visibles para todos los socios
-- * rutinas.para_todos: el personal la marca y todos los socios del gimnasio la ven en su perfil,
--   sin tener que asignarla uno por uno. Solo rutinas del gimnasio (no las propias de un socio).
-- * Si además está asignada a un socio, se muestra una sola vez.
-- =====================================================================

alter table public.rutinas
  add column para_todos boolean not null default false,
  add constraint rutinas_para_todos_solo_gym check (not para_todos or socio_id is null);

create or replace function public.guardar_rutina(p_rutina jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  yo perfiles := _yo();
  v_id uuid := nullif(p_rutina ->> 'id', '')::uuid;
  v_nombre text := trim(coalesce(p_rutina ->> 'nombre', ''));
  v_dias jsonb := coalesce(p_rutina -> 'dias', '[]'::jsonb);
  v_todos boolean := coalesce((p_rutina ->> 'para_todos')::boolean, false);
  d jsonb;
  e jsonb;
  v_dia uuid;
  i int := 0;
  j int;
begin
  if yo.rol not in ('dueno', 'recepcionista') then raise exception 'SIN_PERMISO'; end if;
  if length(v_nombre) < 2 or length(v_nombre) > 80 then raise exception 'RUTINA_INVALIDA' using detail = 'El nombre de la rutina tiene que tener entre 2 y 80 letras.'; end if;
  if jsonb_typeof(v_dias) <> 'array' or jsonb_array_length(v_dias) not between 1 and 14 then
    raise exception 'RUTINA_INVALIDA' using detail = 'La rutina necesita entre 1 y 14 días.';
  end if;

  if v_id is null then
    insert into rutinas (gym_id, nombre, descripcion, para_todos)
    values (yo.gym_id, v_nombre, left(trim(coalesce(p_rutina ->> 'descripcion', '')), 300), v_todos)
    returning id into v_id;
  else
    update rutinas set nombre = v_nombre, descripcion = left(trim(coalesce(p_rutina ->> 'descripcion', '')), 300), para_todos = v_todos, updated_at = now()
    where id = v_id and gym_id = yo.gym_id and socio_id is null;
    if not found then raise exception 'RUTINA_INEXISTENTE'; end if;
    delete from rutina_dias where rutina_id = v_id; -- borra también sus ejercicios
  end if;

  for d in select * from jsonb_array_elements(v_dias) loop
    i := i + 1;
    if length(trim(coalesce(d ->> 'nombre', ''))) not between 1 and 60 then
      raise exception 'RUTINA_INVALIDA' using detail = 'Cada día necesita un nombre (hasta 60 letras).';
    end if;
    if jsonb_array_length(coalesce(d -> 'ejercicios', '[]'::jsonb)) > 40 then
      raise exception 'RUTINA_INVALIDA' using detail = 'Cada día admite hasta 40 ejercicios.';
    end if;
    insert into rutina_dias (gym_id, rutina_id, orden, nombre) values (yo.gym_id, v_id, i, trim(d ->> 'nombre')) returning id into v_dia;
    j := 0;
    for e in select * from jsonb_array_elements(coalesce(d -> 'ejercicios', '[]'::jsonb)) loop
      j := j + 1;
      if length(trim(coalesce(e ->> 'nombre', ''))) not between 1 and 80 then
        raise exception 'RUTINA_INVALIDA' using detail = 'Cada ejercicio necesita un nombre (hasta 80 letras).';
      end if;
      if not _video_valido(trim(coalesce(e ->> 'video', ''))) then
        raise exception 'RUTINA_INVALIDA' using detail = 'El enlace del video tiene que ser de YouTube o Vimeo (https).';
      end if;
      insert into rutina_ejercicios (gym_id, dia_id, orden, nombre, series, repeticiones, descanso, nota, video_url)
      values (yo.gym_id, v_dia, j,
              trim(e ->> 'nombre'),
              left(trim(coalesce(e ->> 'series', '')), 40),
              left(trim(coalesce(e ->> 'repeticiones', '')), 40),
              left(trim(coalesce(e ->> 'descanso', '')), 40),
              left(trim(coalesce(e ->> 'nota', '')), 300),
              trim(coalesce(e ->> 'video', '')));
    end loop;
  end loop;

  insert into auditoria (gym_id, usuario_id, accion, detalle) values (yo.gym_id, yo.id, 'Guardó una rutina', v_nombre);
  return v_id;
end $$;

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
    'entrenamientos_30', (select count(*)::int from entrenamientos e where e.socio_id = s.id and e.finalizado_en > now() - interval '30 days'),
    'dni', case when length(coalesce(s.dni, '')) >= 4 then repeat('•', length(s.dni) - 3) || right(s.dni, 3) end,
    'telefono', case when length(v_tel) >= 4 then '•••• ' || right(v_tel, 4) end,
    'email', case when position('@' in coalesce(s.email, '')) > 1
                  then left(s.email, 1) || '•••@' || split_part(s.email, '@', 2) end
  );
end $$;
