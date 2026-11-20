-- =====================================================================
-- Registro de entrenamientos del socio (desde su perfil, con PIN)
-- * El socio registra peso y repeticiones por serie; se guarda con idempotencia (cliente_id).
-- * Récord = mejor 1RM estimado (Epley: peso × (1 + reps/30)) de ese ejercicio, mayor al de sesiones anteriores.
-- * Todo pasa por funciones con celular vinculado + PIN; las tablas no tienen políticas (nadie las lee directo).
-- =====================================================================

create table public.entrenamientos (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  socio_id uuid not null references public.socios (id) on delete cascade,
  cliente_id uuid not null,
  rutina_id uuid references public.rutinas (id) on delete set null,
  rutina_nombre text not null default '',
  dia_nombre text not null default '',
  iniciado_en timestamptz not null default now(),
  finalizado_en timestamptz not null default now(),
  unique (socio_id, cliente_id)
);
create index on public.entrenamientos (socio_id, finalizado_en desc);

create table public.entrenamiento_series (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  socio_id uuid not null references public.socios (id) on delete cascade,
  entrenamiento_id uuid not null references public.entrenamientos (id) on delete cascade,
  ejercicio text not null,
  orden int not null,
  serie int not null,
  peso numeric(7, 2),
  repeticiones int,
  e1rm numeric(8, 2),
  es_record boolean not null default false
);
create index on public.entrenamiento_series (entrenamiento_id);
create index on public.entrenamiento_series (socio_id, (lower(ejercicio)));

alter table public.entrenamientos enable row level security;
alter table public.entrenamiento_series enable row level security;
-- Sin políticas: solo se accede por las funciones de abajo.

-- ---------------------------------------------------------------------
-- Autenticación del socio: celular vinculado + PIN (con el mismo freno de intentos)
-- Devuelve {ok:true, socio_id, gym_id} o {ok:false, error, ...}
-- ---------------------------------------------------------------------
create or replace function public._qr_auth_pin(p_token text, p_dispositivo uuid, p_pin text)
returns json language plpgsql security definer set search_path = public as $$
declare
  r record;
  pn socio_pins;
  v_activo boolean;
  v_espera interval;
  v_intentos int;
begin
  select * into r from _qr_socio(p_token, p_dispositivo);
  if r.error is not null then return json_build_object('ok', false, 'error', r.error); end if;
  select activo into v_activo from socios where id = r.socio_id;
  if not v_activo then return json_build_object('ok', false, 'error', 'INACTIVO'); end if;

  select * into pn from socio_pins where socio_id = r.socio_id for update;
  if not found then return json_build_object('ok', false, 'error', 'SIN_PIN'); end if;
  if pn.bloqueado_hasta is not null and pn.bloqueado_hasta > now() then
    return json_build_object('ok', false, 'error', 'BLOQUEADO', 'bloqueado_hasta', pn.bloqueado_hasta);
  end if;
  if coalesce(p_pin, '') !~ '^[0-9]{4}$' then return json_build_object('ok', false, 'error', 'PIN_INVALIDO'); end if;

  if extensions.crypt(p_pin, pn.pin_hash) = pn.pin_hash then
    update socio_pins set intentos = 0, bloqueos = 0, bloqueado_hasta = null where socio_id = pn.socio_id;
    return json_build_object('ok', true, 'socio_id', r.socio_id, 'gym_id', r.gym_id);
  end if;

  v_intentos := pn.intentos + 1;
  if v_intentos >= 5 then
    v_espera := least(interval '24 hours', interval '15 minutes' * power(2, pn.bloqueos));
    update socio_pins set intentos = 0, bloqueos = pn.bloqueos + 1, bloqueado_hasta = now() + v_espera where socio_id = pn.socio_id;
    return json_build_object('ok', false, 'error', 'BLOQUEADO', 'bloqueado_hasta', now() + v_espera);
  end if;
  update socio_pins set intentos = v_intentos where socio_id = pn.socio_id;
  return json_build_object('ok', false, 'error', 'PIN_INCORRECTO', 'restantes', 5 - v_intentos);
end $$;

-- qr_perfil ahora usa la autenticación común (mismo comportamiento)
create or replace function public.qr_perfil(p_token text, p_dispositivo uuid, p_pin text)
returns json language plpgsql security definer set search_path = public as $$
declare
  v json := _qr_auth_pin(p_token, p_dispositivo, p_pin);
begin
  if (v ->> 'ok')::boolean is not true then return v; end if;
  return _qr_perfil((v ->> 'socio_id')::uuid);
end $$;

-- ---------------------------------------------------------------------
-- Historial por ejercicio: la última vez (para precargar) y los mejores marcas
-- ---------------------------------------------------------------------
create or replace function public.qr_entrenamiento_datos(p_token text, p_dispositivo uuid, p_pin text)
returns json language plpgsql security definer set search_path = public as $$
declare
  v json := _qr_auth_pin(p_token, p_dispositivo, p_pin);
  v_socio uuid;
begin
  if (v ->> 'ok')::boolean is not true then return v; end if;
  v_socio := (v ->> 'socio_id')::uuid;
  return json_build_object('ok', true, 'ejercicios', coalesce((
    with ult as (
      select distinct on (lower(es.ejercicio)) lower(es.ejercicio) as k, es.entrenamiento_id, e.finalizado_en
      from entrenamiento_series es
      join entrenamientos e on e.id = es.entrenamiento_id
      where es.socio_id = v_socio
      order by lower(es.ejercicio), e.finalizado_en desc
    ),
    mejor as (
      select lower(ejercicio) as k, max(e1rm) as m1, max(peso) as mp
      from entrenamiento_series where socio_id = v_socio group by 1
    )
    select json_object_agg(u.k, json_build_object(
      'fecha', u.finalizado_en,
      'series', (select json_agg(json_build_object('peso', s.peso, 'reps', s.repeticiones) order by s.serie)
                 from entrenamiento_series s where s.entrenamiento_id = u.entrenamiento_id and lower(s.ejercicio) = u.k),
      'mejor_e1rm', m.m1,
      'mejor_peso', m.mp
    ))
    from ult u join mejor m on m.k = u.k
  ), '{}'::json));
end $$;

-- ---------------------------------------------------------------------
-- Guardar un entrenamiento terminado
-- p_datos: { cliente_id, rutina_id?, rutina_nombre, dia_nombre, iniciado_en?,
--            ejercicios: [{ nombre, series: [{ peso, reps }] }] }
-- ---------------------------------------------------------------------
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
  select id into v_rutina from rutinas where id = nullif(p_datos ->> 'rutina_id', '')::uuid and gym_id = v_gym;

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

-- ---------------------------------------------------------------------
-- Perfil del socio: suma sus últimos entrenamientos
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
    'entrenamientos_30', (select count(*)::int from entrenamientos e where e.socio_id = s.id and e.finalizado_en > now() - interval '30 days'),
    'dni', case when length(coalesce(s.dni, '')) >= 4 then repeat('•', length(s.dni) - 3) || right(s.dni, 3) end,
    'telefono', case when length(v_tel) >= 4 then '•••• ' || right(v_tel, 4) end,
    'email', case when position('@' in coalesce(s.email, '')) > 1
                  then left(s.email, 1) || '•••@' || split_part(s.email, '@', 2) end
  );
end $$;

revoke execute on function public._qr_auth_pin(text, uuid, text) from anon, authenticated, public;
grant execute on function public.qr_entrenamiento_datos(text, uuid, text), public.qr_entrenamiento_guardar(text, uuid, text, jsonb) to anon, authenticated;
