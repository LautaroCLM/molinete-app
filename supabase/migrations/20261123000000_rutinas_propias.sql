-- =====================================================================
-- Rutinas propias del socio, sus récords y la biblioteca vista desde el celular
-- * El socio (celular vinculado + PIN) arma, edita y borra SUS rutinas: hasta 10, con los mismos límites que el personal.
-- * Son PRIVADAS: el personal del gimnasio no las ve (ni por la base) ni puede asignarlas, editarlas o archivarlas.
-- * "Mis récords": mejor marca de cada ejercicio (peso y 1RM estimado), con fecha.
-- =====================================================================

alter table public.rutinas add column socio_id uuid references public.socios (id) on delete cascade;
create index on public.rutinas (socio_id) where socio_id is not null;

-- El personal solo lee las rutinas del gimnasio (no las propias de los socios), ni sus días y ejercicios.
drop policy rutinas_select on public.rutinas;
drop policy rutina_dias_select on public.rutina_dias;
drop policy rutina_ejercicios_select on public.rutina_ejercicios;
create policy rutinas_select on public.rutinas for select using (gym_id = mi_gym() and socio_id is null);
create policy rutina_dias_select on public.rutina_dias for select
  using (gym_id = mi_gym() and exists (select 1 from public.rutinas r where r.id = rutina_dias.rutina_id));
create policy rutina_ejercicios_select on public.rutina_ejercicios for select
  using (gym_id = mi_gym() and exists (select 1 from public.rutina_dias d where d.id = rutina_ejercicios.dia_id));

-- ---------------------------------------------------------------------
-- Crear / editar una rutina propia: { id?, nombre, descripcion, dias: [{ nombre, ejercicios: [{ nombre, series, repeticiones, descanso, nota, video }] }] }
-- ---------------------------------------------------------------------
create or replace function public.qr_rutina_guardar(p_token text, p_dispositivo uuid, p_pin text, p_rutina jsonb)
returns json language plpgsql security definer set search_path = public as $$
declare
  v json := _qr_auth_pin(p_token, p_dispositivo, p_pin);
  v_socio uuid;
  v_gym uuid;
  v_id uuid := nullif(p_rutina ->> 'id', '')::uuid;
  v_nombre text := trim(coalesce(p_rutina ->> 'nombre', ''));
  v_dias jsonb := coalesce(p_rutina -> 'dias', '[]'::jsonb);
  d jsonb;
  e jsonb;
  v_dia uuid;
  i int := 0;
  j int;
begin
  if (v ->> 'ok')::boolean is not true then return v; end if;
  v_socio := (v ->> 'socio_id')::uuid;
  v_gym := (v ->> 'gym_id')::uuid;

  -- Validación completa antes de escribir
  if length(v_nombre) < 2 or length(v_nombre) > 80 then return json_build_object('ok', false, 'error', 'RUTINA_INVALIDA', 'detalle', 'El nombre de la rutina tiene que tener entre 2 y 80 letras.'); end if;
  if jsonb_typeof(v_dias) <> 'array' or jsonb_array_length(v_dias) not between 1 and 14 then
    return json_build_object('ok', false, 'error', 'RUTINA_INVALIDA', 'detalle', 'La rutina necesita entre 1 y 14 días.');
  end if;
  for d in select * from jsonb_array_elements(v_dias) loop
    if length(trim(coalesce(d ->> 'nombre', ''))) not between 1 and 60 then
      return json_build_object('ok', false, 'error', 'RUTINA_INVALIDA', 'detalle', 'Cada día necesita un nombre (hasta 60 letras).');
    end if;
    if jsonb_typeof(coalesce(d -> 'ejercicios', '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(d -> 'ejercicios', '[]'::jsonb)) > 40 then
      return json_build_object('ok', false, 'error', 'RUTINA_INVALIDA', 'detalle', 'Cada día admite hasta 40 ejercicios.');
    end if;
    for e in select * from jsonb_array_elements(coalesce(d -> 'ejercicios', '[]'::jsonb)) loop
      if length(trim(coalesce(e ->> 'nombre', ''))) not between 1 and 80 then
        return json_build_object('ok', false, 'error', 'RUTINA_INVALIDA', 'detalle', 'Cada ejercicio necesita un nombre (hasta 80 letras).');
      end if;
      if not _video_valido(trim(coalesce(e ->> 'video', ''))) then
        return json_build_object('ok', false, 'error', 'RUTINA_INVALIDA', 'detalle', 'El enlace del video tiene que ser de YouTube o Vimeo (https).');
      end if;
    end loop;
  end loop;

  if v_id is null then
    if (select count(*) from rutinas where socio_id = v_socio) >= 10 then
      return json_build_object('ok', false, 'error', 'LIMITE_RUTINAS');
    end if;
    insert into rutinas (gym_id, socio_id, nombre, descripcion)
    values (v_gym, v_socio, v_nombre, left(trim(coalesce(p_rutina ->> 'descripcion', '')), 300))
    returning id into v_id;
  else
    update rutinas set nombre = v_nombre, descripcion = left(trim(coalesce(p_rutina ->> 'descripcion', '')), 300), updated_at = now()
    where id = v_id and socio_id = v_socio;
    if not found then return json_build_object('ok', false, 'error', 'RUTINA_INEXISTENTE'); end if;
    delete from rutina_dias where rutina_id = v_id;
  end if;

  for d in select * from jsonb_array_elements(v_dias) loop
    i := i + 1;
    insert into rutina_dias (gym_id, rutina_id, orden, nombre) values (v_gym, v_id, i, trim(d ->> 'nombre')) returning id into v_dia;
    j := 0;
    for e in select * from jsonb_array_elements(coalesce(d -> 'ejercicios', '[]'::jsonb)) loop
      j := j + 1;
      insert into rutina_ejercicios (gym_id, dia_id, orden, nombre, series, repeticiones, descanso, nota, video_url)
      values (v_gym, v_dia, j, trim(e ->> 'nombre'),
              left(trim(coalesce(e ->> 'series', '')), 40), left(trim(coalesce(e ->> 'repeticiones', '')), 40),
              left(trim(coalesce(e ->> 'descanso', '')), 40), left(trim(coalesce(e ->> 'nota', '')), 300),
              trim(coalesce(e ->> 'video', '')));
    end loop;
  end loop;
  return json_build_object('ok', true, 'id', v_id);
end $$;

create or replace function public.qr_rutina_eliminar(p_token text, p_dispositivo uuid, p_pin text, p_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare
  v json := _qr_auth_pin(p_token, p_dispositivo, p_pin);
begin
  if (v ->> 'ok')::boolean is not true then return v; end if;
  delete from rutinas where id = p_id and socio_id = (v ->> 'socio_id')::uuid;
  if not found then return json_build_object('ok', false, 'error', 'RUTINA_INEXISTENTE'); end if;
  return json_build_object('ok', true);
end $$;

-- Biblioteca del gimnasio (para sugerir ejercicios y traer sus videos al armar una rutina propia)
create or replace function public.qr_biblioteca(p_token text, p_dispositivo uuid, p_pin text)
returns json language plpgsql security definer set search_path = public as $$
declare
  v json := _qr_auth_pin(p_token, p_dispositivo, p_pin);
begin
  if (v ->> 'ok')::boolean is not true then return v; end if;
  return json_build_object('ok', true, 'ejercicios', coalesce((
    select json_agg(json_build_object('nombre', b.nombre, 'grupo', b.grupo, 'video', b.video_url) order by b.nombre)
    from biblioteca_ejercicios b where b.gym_id = (v ->> 'gym_id')::uuid
  ), '[]'::json));
end $$;

-- Récords: por ejercicio, la mejor fuerza estimada (1RM) y el mayor peso, con su fecha
create or replace function public.qr_records(p_token text, p_dispositivo uuid, p_pin text)
returns json language plpgsql security definer set search_path = public as $$
declare
  v json := _qr_auth_pin(p_token, p_dispositivo, p_pin);
  v_socio uuid;
begin
  if (v ->> 'ok')::boolean is not true then return v; end if;
  v_socio := (v ->> 'socio_id')::uuid;
  return json_build_object('ok', true, 'ejercicios', coalesce((
    with s as (
      select lower(es.ejercicio) as k, es.ejercicio, es.peso, es.repeticiones, es.e1rm, e.finalizado_en as fecha
      from entrenamiento_series es join entrenamientos e on e.id = es.entrenamiento_id
      where es.socio_id = v_socio and es.peso is not null and es.peso > 0
    ),
    mejor_e as (select distinct on (k) k, ejercicio, peso, repeticiones, e1rm, fecha from s order by k, e1rm desc nulls last, fecha desc),
    mejor_p as (select distinct on (k) k, peso, repeticiones, fecha from s order by k, peso desc, repeticiones desc, fecha desc),
    veces as (
      select lower(es.ejercicio) as k, count(*) filter (where es.es_record) as records, count(distinct es.entrenamiento_id) as sesiones
      from entrenamiento_series es where es.socio_id = v_socio group by 1
    )
    select json_agg(json_build_object(
      'nombre', e.ejercicio, 'e1rm', e.e1rm, 'peso_e1rm', e.peso, 'reps_e1rm', e.repeticiones, 'fecha_e1rm', e.fecha,
      'mejor_peso', p.peso, 'reps_mejor_peso', p.repeticiones, 'fecha_mejor_peso', p.fecha,
      'records', v2.records, 'sesiones', v2.sesiones
    ) order by e.fecha desc)
    from mejor_e e join mejor_p p using (k) join veces v2 using (k)
  ), '[]'::json));
end $$;

revoke execute on function public.qr_rutina_guardar(text, uuid, text, jsonb), public.qr_rutina_eliminar(text, uuid, text, uuid),
  public.qr_biblioteca(text, uuid, text), public.qr_records(text, uuid, text) from public;
grant execute on function public.qr_rutina_guardar(text, uuid, text, jsonb), public.qr_rutina_eliminar(text, uuid, text, uuid),
  public.qr_biblioteca(text, uuid, text), public.qr_records(text, uuid, text) to anon, authenticated;

-- Funciones del personal: no pueden tocar rutinas propias de un socio


create or replace function public.guardar_rutina(p_rutina jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  yo perfiles := _yo();
  v_id uuid := nullif(p_rutina ->> 'id', '')::uuid;
  v_nombre text := trim(coalesce(p_rutina ->> 'nombre', ''));
  v_dias jsonb := coalesce(p_rutina -> 'dias', '[]'::jsonb);
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
    insert into rutinas (gym_id, nombre, descripcion)
    values (yo.gym_id, v_nombre, left(trim(coalesce(p_rutina ->> 'descripcion', '')), 300))
    returning id into v_id;
  else
    update rutinas set nombre = v_nombre, descripcion = left(trim(coalesce(p_rutina ->> 'descripcion', '')), 300), updated_at = now()
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

create or replace function public.duplicar_rutina(p_rutina uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  yo perfiles := _yo();
  r rutinas;
  v_nueva uuid;
  d rutina_dias;
  v_dia uuid;
begin
  if yo.rol not in ('dueno', 'recepcionista') then raise exception 'SIN_PERMISO'; end if;
  select * into r from rutinas where id = p_rutina and gym_id = yo.gym_id and socio_id is null;
  if not found then raise exception 'RUTINA_INEXISTENTE'; end if;
  insert into rutinas (gym_id, nombre, descripcion) values (yo.gym_id, left('Copia de ' || r.nombre, 80), r.descripcion) returning id into v_nueva;
  for d in select * from rutina_dias where rutina_id = r.id order by orden loop
    insert into rutina_dias (gym_id, rutina_id, orden, nombre) values (yo.gym_id, v_nueva, d.orden, d.nombre) returning id into v_dia;
    insert into rutina_ejercicios (gym_id, dia_id, orden, nombre, series, repeticiones, descanso, nota, video_url)
    select yo.gym_id, v_dia, e.orden, e.nombre, e.series, e.repeticiones, e.descanso, e.nota, e.video_url from rutina_ejercicios e where e.dia_id = d.id;
  end loop;
  insert into auditoria (gym_id, usuario_id, accion, detalle) values (yo.gym_id, yo.id, 'Duplicó una rutina', r.nombre);
  return v_nueva;
end $$;

create or replace function public.archivar_rutina(p_rutina uuid, p_activo boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  yo perfiles := _yo();
  r rutinas;
begin
  if yo.rol not in ('dueno', 'recepcionista') then raise exception 'SIN_PERMISO'; end if;
  update rutinas set activo = p_activo, updated_at = now() where id = p_rutina and gym_id = yo.gym_id and socio_id is null returning * into r;
  if not found then raise exception 'RUTINA_INEXISTENTE'; end if;
  insert into auditoria (gym_id, usuario_id, accion, detalle)
  values (yo.gym_id, yo.id, case when p_activo then 'Restauró una rutina' else 'Archivó una rutina' end, r.nombre);
end $$;

create or replace function public.asignar_rutina(p_socio uuid, p_rutina uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  yo perfiles := _yo();
  s socios;
  r rutinas;
  v_filas int;
begin
  if yo.rol not in ('dueno', 'recepcionista') then raise exception 'SIN_PERMISO'; end if;
  select * into s from socios where id = p_socio and gym_id = yo.gym_id;
  if not found then raise exception 'SOCIO_INEXISTENTE'; end if;
  select * into r from rutinas where id = p_rutina and gym_id = yo.gym_id and activo and socio_id is null;
  if not found then raise exception 'RUTINA_INEXISTENTE'; end if;
  insert into socio_rutinas (gym_id, socio_id, rutina_id, asignada_por) values (yo.gym_id, s.id, r.id, yo.id)
  on conflict (socio_id, rutina_id) do nothing;
  get diagnostics v_filas = row_count;
  if v_filas > 0 then
    insert into auditoria (gym_id, usuario_id, accion, detalle) values (yo.gym_id, yo.id, 'Asignó una rutina', s.nombre || ' ' || s.apellido || ' · ' || r.nombre);
  end if;
end $$;

-- Entrenamiento: solo asocia rutinas del gimnasio o propias
create or replace function public.qr_entrenamiento_guardar(p_token text, p_dispositivo uuid, p_pin text, p_datos jsonb)
returns json language plpgsql security definer set search_path = public as $$
declare
  v json := _qr_auth_pin(p_token, p_dispositivo, p_pin);
  v_socio uuid;
  v_gym uuid;
  v_cliente uuid;
  v_id uuid;
  v_ini timestamptz;
  v_rutina uuid;
  ej jsonb;
  se jsonb;
  v_nombre text;
  v_previo numeric;
  v_peso numeric;
  v_reps int;
  v_e numeric;
  v_mejor numeric;
  v_mejor_i int;
  i int;
  j int;
  v_total int := 0;
  v_volumen numeric := 0;
  v_records text[] := '{}';
begin
  if (v ->> 'ok')::boolean is not true then return v; end if;
  v_socio := (v ->> 'socio_id')::uuid;
  v_gym := (v ->> 'gym_id')::uuid;

  begin
    v_cliente := (p_datos ->> 'cliente_id')::uuid;
  exception when others then
    return json_build_object('ok', false, 'error', 'DATOS_INVALIDOS');
  end;
  if v_cliente is null or jsonb_typeof(p_datos -> 'ejercicios') <> 'array'
     or jsonb_array_length(p_datos -> 'ejercicios') not between 1 and 40 then
    return json_build_object('ok', false, 'error', 'DATOS_INVALIDOS');
  end if;

  -- Reintento del mismo entrenamiento: devuelve el ya guardado
  select id into v_id from entrenamientos where socio_id = v_socio and cliente_id = v_cliente;
  if found then return json_build_object('ok', true, 'id', v_id, 'repetido', true, 'records', '[]'::json); end if;

  -- Validación de todas las series antes de escribir nada
  for ej in select * from jsonb_array_elements(p_datos -> 'ejercicios') loop
    if length(trim(coalesce(ej ->> 'nombre', ''))) not between 1 and 80
       or jsonb_typeof(ej -> 'series') <> 'array' or jsonb_array_length(ej -> 'series') not between 1 and 20 then
      return json_build_object('ok', false, 'error', 'DATOS_INVALIDOS');
    end if;
    for se in select * from jsonb_array_elements(ej -> 'series') loop
      begin
        v_peso := nullif(se ->> 'peso', '')::numeric;
        v_reps := nullif(se ->> 'reps', '')::int;
      exception when others then
        return json_build_object('ok', false, 'error', 'DATOS_INVALIDOS');
      end;
      if (v_peso is not null and (v_peso < 0 or v_peso > 1000)) or (v_reps is not null and (v_reps < 1 or v_reps > 1000))
         or (v_peso is null and v_reps is null) then
        return json_build_object('ok', false, 'error', 'DATOS_INVALIDOS');
      end if;
      v_total := v_total + 1;
    end loop;
  end loop;

  begin
    v_ini := (p_datos ->> 'iniciado_en')::timestamptz;
  exception when others then
    v_ini := null;
  end;
  if v_ini is null or v_ini > now() or v_ini < now() - interval '24 hours' then v_ini := now(); end if;
  select id into v_rutina from rutinas where id = nullif(p_datos ->> 'rutina_id', '')::uuid and gym_id = v_gym and (socio_id is null or socio_id = v_socio);

  insert into entrenamientos (gym_id, socio_id, cliente_id, rutina_id, rutina_nombre, dia_nombre, iniciado_en)
  values (v_gym, v_socio, v_cliente, v_rutina, left(trim(coalesce(p_datos ->> 'rutina_nombre', '')), 80),
          left(trim(coalesce(p_datos ->> 'dia_nombre', '')), 60), v_ini)
  returning id into v_id;

  i := 0;
  for ej in select * from jsonb_array_elements(p_datos -> 'ejercicios') loop
    i := i + 1;
    v_nombre := trim(ej ->> 'nombre');
    select coalesce(max(e1rm), 0) into v_previo from entrenamiento_series where socio_id = v_socio and lower(ejercicio) = lower(v_nombre);
    v_mejor := 0; v_mejor_i := 0; j := 0;
    for se in select * from jsonb_array_elements(ej -> 'series') loop
      j := j + 1;
      v_peso := nullif(se ->> 'peso', '')::numeric;
      v_reps := nullif(se ->> 'reps', '')::int;
      v_e := case when v_peso is not null and v_peso > 0 and v_reps is not null then round(v_peso * (1 + v_reps / 30.0), 2) end;
      insert into entrenamiento_series (gym_id, socio_id, entrenamiento_id, ejercicio, orden, serie, peso, repeticiones, e1rm)
      values (v_gym, v_socio, v_id, v_nombre, i, j, v_peso, v_reps, v_e);
      if v_e is not null and v_e > v_mejor then v_mejor := v_e; v_mejor_i := j; end if;
      v_volumen := v_volumen + coalesce(v_peso, 0) * coalesce(v_reps, 0);
    end loop;
    -- Récord: la mejor serie del ejercicio supera la marca anterior (la primera vez no cuenta como récord)
    if v_previo > 0 and v_mejor > v_previo then
      update entrenamiento_series set es_record = true
      where entrenamiento_id = v_id and orden = i and serie = v_mejor_i;
      v_records := v_records || v_nombre;
    end if;
  end loop;

  return json_build_object('ok', true, 'id', v_id, 'series', v_total, 'volumen', v_volumen, 'records', to_json(v_records));
end $$;

-- Perfil: rutinas asignadas y propias
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
      ) order by m.desde desc)
      from (
        select r.id, r.nombre, r.descripcion, sr.asignada_en as desde, false as propia
        from socio_rutinas sr join rutinas r on r.id = sr.rutina_id and r.activo
        where sr.socio_id = s.id and r.socio_id is null
        union all
        select r.id, r.nombre, r.descripcion, r.created_at as desde, true as propia
        from rutinas r where r.socio_id = s.id and r.activo
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
