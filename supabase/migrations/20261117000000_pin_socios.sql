-- =====================================================================
-- PIN del socio para ver su perfil desde el QR
-- * El socio elige un PIN de 4 dígitos la primera vez que toca "Ver mi perfil".
-- * Se guarda cifrado (bcrypt): nadie puede verlo, solo borrarlo.
-- * 5 intentos fallidos bloquean 15 min; cada bloqueo siguiente duplica la espera (máx. 24 h).
-- * Dueño y recepción pueden restablecerlo; eso además cierra la sesión en los celulares del socio.
-- * El perfil no incluye montos y enmascara DNI, teléfono y email.
-- =====================================================================

create table public.socio_pins (
  socio_id uuid primary key references public.socios (id) on delete cascade,
  gym_id uuid not null references public.gyms (id) on delete cascade,
  pin_hash text not null,
  intentos int not null default 0,
  bloqueos int not null default 0,
  bloqueado_hasta timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.socio_pins enable row level security;
-- Sin políticas: solo se accede por las funciones de abajo.

-- Resuelve QR + celular vinculado. Siempre devuelve una fila (error nulo = todo bien).
create or replace function public._qr_socio(p_token text, p_dispositivo uuid)
returns table (socio_id uuid, gym_id uuid, error text)
language sql stable security definer set search_path = public as $$
  select d.socio_id, g.id,
    case when g.id is null then 'QR_INVALIDO'
         when not g.qr_activo then 'QR_INACTIVO'
         when d.token is null then 'DISPOSITIVO_DESCONOCIDO' end
  from (select 1) x
  left join gyms g on g.qr_token = p_token
  left join socio_dispositivos d on d.token = p_dispositivo and d.gym_id = g.id
$$;

-- Perfil que ve el socio: sin montos, con datos personales enmascarados
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
    'dni', case when length(coalesce(s.dni, '')) >= 4 then repeat('•', length(s.dni) - 3) || right(s.dni, 3) end,
    'telefono', case when length(v_tel) >= 4 then '•••• ' || right(v_tel, 4) end,
    'email', case when position('@' in coalesce(s.email, '')) > 1
                  then left(s.email, 1) || '•••@' || split_part(s.email, '@', 2) end
  );
end $$;

-- ¿Ya eligió un PIN? ¿Está bloqueado?
create or replace function public.qr_perfil_estado(p_token text, p_dispositivo uuid)
returns json language plpgsql security definer set search_path = public as $$
declare
  r record;
  pn socio_pins;
begin
  select * into r from _qr_socio(p_token, p_dispositivo);
  if r.error is not null then return json_build_object('ok', false, 'error', r.error); end if;
  select * into pn from socio_pins where socio_id = r.socio_id;
  return json_build_object(
    'ok', true,
    'tiene_pin', found,
    'bloqueado_hasta', case when found and pn.bloqueado_hasta > now() then pn.bloqueado_hasta end
  );
end $$;

-- Primera vez: elige su PIN. Si ya tiene, no se puede pisar (solo el gimnasio lo restablece).
create or replace function public.qr_pin_crear(p_token text, p_dispositivo uuid, p_pin text)
returns json language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_activo boolean;
  v_filas int;
begin
  select * into r from _qr_socio(p_token, p_dispositivo);
  if r.error is not null then return json_build_object('ok', false, 'error', r.error); end if;
  if coalesce(p_pin, '') !~ '^[0-9]{4}$' then return json_build_object('ok', false, 'error', 'PIN_INVALIDO'); end if;
  select activo into v_activo from socios where id = r.socio_id;
  if not v_activo then return json_build_object('ok', false, 'error', 'INACTIVO'); end if;

  insert into socio_pins (socio_id, gym_id, pin_hash)
  values (r.socio_id, r.gym_id, extensions.crypt(p_pin, extensions.gen_salt('bf')))
  on conflict (socio_id) do nothing;
  get diagnostics v_filas = row_count;
  if v_filas = 0 then return json_build_object('ok', false, 'error', 'YA_TIENE_PIN'); end if;

  return _qr_perfil(r.socio_id);
end $$;

-- Entra al perfil con el PIN
create or replace function public.qr_perfil(p_token text, p_dispositivo uuid, p_pin text)
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
    return _qr_perfil(r.socio_id);
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

-- ---------------------------------------------------------------------
-- Gimnasio (dueño y recepción)
-- ---------------------------------------------------------------------
-- Borra el PIN y cierra la sesión en los celulares del socio: tendrá que ingresar su DNI y elegir un PIN nuevo.
create or replace function public.socio_restablecer_pin(p_socio uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  yo perfiles := _yo();
  s socios;
  v_filas int;
begin
  if yo.rol not in ('dueno', 'recepcionista') then raise exception 'SIN_PERMISO'; end if;
  select * into s from socios where id = p_socio and gym_id = yo.gym_id;
  if not found then raise exception 'SOCIO_INEXISTENTE'; end if;
  delete from socio_pins where socio_id = s.id;
  get diagnostics v_filas = row_count;
  delete from socio_dispositivos where socio_id = s.id;
  if v_filas > 0 then
    insert into auditoria (gym_id, usuario_id, accion, detalle)
    values (yo.gym_id, yo.id, 'Restableció el PIN', s.nombre || ' ' || s.apellido);
  end if;
end $$;

create or replace function public.socio_tiene_pin(p_socio uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  yo perfiles := _yo();
begin
  return exists (select 1 from socio_pins where socio_id = p_socio and gym_id = yo.gym_id);
end $$;

revoke execute on function public._qr_socio(text, uuid), public._qr_perfil(uuid) from anon, authenticated, public;
revoke execute on function public.socio_restablecer_pin(uuid), public.socio_tiene_pin(uuid) from anon, public;
grant execute on function public.qr_perfil_estado(text, uuid), public.qr_pin_crear(text, uuid, text), public.qr_perfil(text, uuid, text) to anon, authenticated;
grant execute on function public.socio_restablecer_pin(uuid), public.socio_tiene_pin(uuid) to authenticated;
