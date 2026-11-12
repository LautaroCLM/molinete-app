-- =====================================================================
-- Rutinas
-- * Dueño y recepción arman rutinas (días con ejercicios escritos a mano) y se las asignan a los socios.
-- * El socio las ve en su perfil (con PIN). "Hoy te toca" rota por asistencias:
--   días distintos en que vino desde que se le asignó la rutina, sin contar hoy, módulo la cantidad de días.
-- * Toda escritura pasa por funciones (validan rol y gimnasio); las tablas solo se leen con RLS.
-- =====================================================================

create table public.rutinas (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  nombre text not null,
  descripcion text not null default '',
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.rutinas (gym_id, activo);

create table public.rutina_dias (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  rutina_id uuid not null references public.rutinas (id) on delete cascade,
  orden int not null,
  nombre text not null
);
create index on public.rutina_dias (rutina_id, orden);

create table public.rutina_ejercicios (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  dia_id uuid not null references public.rutina_dias (id) on delete cascade,
  orden int not null,
  nombre text not null,
  series text not null default '',
  repeticiones text not null default '',
  descanso text not null default '',
  nota text not null default ''
);
create index on public.rutina_ejercicios (dia_id, orden);

create table public.socio_rutinas (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  socio_id uuid not null references public.socios (id) on delete cascade,
  rutina_id uuid not null references public.rutinas (id) on delete cascade,
  asignada_en timestamptz not null default now(),
  asignada_por uuid references public.perfiles (id),
  unique (socio_id, rutina_id)
);
create index on public.socio_rutinas (rutina_id);

alter table public.rutinas enable row level security;
alter table public.rutina_dias enable row level security;
alter table public.rutina_ejercicios enable row level security;
alter table public.socio_rutinas enable row level security;

-- Solo lectura para el personal del gimnasio; las escrituras van por las funciones de abajo.
create policy rutinas_select on public.rutinas for select using (gym_id = mi_gym());
create policy rutina_dias_select on public.rutina_dias for select using (gym_id = mi_gym());
create policy rutina_ejercicios_select on public.rutina_ejercicios for select using (gym_id = mi_gym());
create policy socio_rutinas_select on public.socio_rutinas for select using (gym_id = mi_gym());

-- ---------------------------------------------------------------------
-- Crear / editar una rutina completa (días y ejercicios) en un solo paso
-- p_rutina: { id?, nombre, descripcion, dias: [{ nombre, ejercicios: [{ nombre, series, repeticiones, descanso, nota }] }] }
-- ---------------------------------------------------------------------
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
    where id = v_id and gym_id = yo.gym_id;
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
      insert into rutina_ejercicios (gym_id, dia_id, orden, nombre, series, repeticiones, descanso, nota)
      values (yo.gym_id, v_dia, j,
              trim(e ->> 'nombre'),
              left(trim(coalesce(e ->> 'series', '')), 40),
              left(trim(coalesce(e ->> 'repeticiones', '')), 40),
              left(trim(coalesce(e ->> 'descanso', '')), 40),
              left(trim(coalesce(e ->> 'nota', '')), 300));
    end loop;
  end loop;

  insert into auditoria (gym_id, usuario_id, accion, detalle) values (yo.gym_id, yo.id, 'Guardó una rutina', v_nombre);
  return v_id;
end $$;

create or replace function public.archivar_rutina(p_rutina uuid, p_activo boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  yo perfiles := _yo();
  r rutinas;
begin
  if yo.rol not in ('dueno', 'recepcionista') then raise exception 'SIN_PERMISO'; end if;
  update rutinas set activo = p_activo, updated_at = now() where id = p_rutina and gym_id = yo.gym_id returning * into r;
  if not found then raise exception 'RUTINA_INEXISTENTE'; end if;
  insert into auditoria (gym_id, usuario_id, accion, detalle)
  values (yo.gym_id, yo.id, case when p_activo then 'Restauró una rutina' else 'Archivó una rutina' end, r.nombre);
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
  select * into r from rutinas where id = p_rutina and gym_id = yo.gym_id;
  if not found then raise exception 'RUTINA_INEXISTENTE'; end if;
  insert into rutinas (gym_id, nombre, descripcion) values (yo.gym_id, left('Copia de ' || r.nombre, 80), r.descripcion) returning id into v_nueva;
  for d in select * from rutina_dias where rutina_id = r.id order by orden loop
    insert into rutina_dias (gym_id, rutina_id, orden, nombre) values (yo.gym_id, v_nueva, d.orden, d.nombre) returning id into v_dia;
    insert into rutina_ejercicios (gym_id, dia_id, orden, nombre, series, repeticiones, descanso, nota)
    select yo.gym_id, v_dia, e.orden, e.nombre, e.series, e.repeticiones, e.descanso, e.nota from rutina_ejercicios e where e.dia_id = d.id;
  end loop;
  insert into auditoria (gym_id, usuario_id, accion, detalle) values (yo.gym_id, yo.id, 'Duplicó una rutina', r.nombre);
  return v_nueva;
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
  select * into r from rutinas where id = p_rutina and gym_id = yo.gym_id and activo;
  if not found then raise exception 'RUTINA_INEXISTENTE'; end if;
  insert into socio_rutinas (gym_id, socio_id, rutina_id, asignada_por) values (yo.gym_id, s.id, r.id, yo.id)
  on conflict (socio_id, rutina_id) do nothing;
  get diagnostics v_filas = row_count;
  if v_filas > 0 then
    insert into auditoria (gym_id, usuario_id, accion, detalle) values (yo.gym_id, yo.id, 'Asignó una rutina', s.nombre || ' ' || s.apellido || ' · ' || r.nombre);
  end if;
end $$;

create or replace function public.quitar_rutina(p_socio uuid, p_rutina uuid)
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
  select * into r from rutinas where id = p_rutina and gym_id = yo.gym_id;
  delete from socio_rutinas where socio_id = s.id and rutina_id = p_rutina and gym_id = yo.gym_id;
  get diagnostics v_filas = row_count;
  if v_filas > 0 then
    insert into auditoria (gym_id, usuario_id, accion, detalle) values (yo.gym_id, yo.id, 'Quitó una rutina', s.nombre || ' ' || s.apellido || ' · ' || coalesce(r.nombre, ''));
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Perfil del socio (QR + PIN): ahora incluye sus rutinas y qué día le toca hoy
-- ---------------------------------------------------------------------
create or replace function public._qr_perfil(p_socio uuid)
returns json language plpgsql security definer set search_path = public as $$
declare
  s socios;
  g gyms;
  pl planes;
  v_tel text;
begin
  select * into s from socios where id = p_socio;
  select * into g from gyms where id = s.gym_id;
  select * into pl from planes where id = s.plan_id;
  v_tel := regexp_replace(coalesce(s.telefono, ''), '\D', '', 'g');

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
        -- índice (desde 0) del día que le toca hoy, por rotación de asistencias
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
    'dni', case when length(coalesce(s.dni, '')) >= 4 then repeat('•', length(s.dni) - 3) || right(s.dni, 3) end,
    'telefono', case when length(v_tel) >= 4 then '•••• ' || right(v_tel, 4) end,
    'email', case when position('@' in coalesce(s.email, '')) > 1
                  then left(s.email, 1) || '•••@' || split_part(s.email, '@', 2) end
  );
end $$;

revoke execute on function public.guardar_rutina(jsonb), public.archivar_rutina(uuid, boolean), public.duplicar_rutina(uuid),
  public.asignar_rutina(uuid, uuid), public.quitar_rutina(uuid, uuid) from anon, public;
grant execute on function public.guardar_rutina(jsonb), public.archivar_rutina(uuid, boolean), public.duplicar_rutina(uuid),
  public.asignar_rutina(uuid, uuid), public.quitar_rutina(uuid, uuid) to authenticated;
