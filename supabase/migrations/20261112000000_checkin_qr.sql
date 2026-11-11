-- =====================================================================
-- Etapa 3 · Ingreso con QR
-- Un QR fijo por gimnasio abre una página pública. La primera vez el socio
-- pone su DNI y el celular queda vinculado (token de dispositivo). Después,
-- cada vez que escanea se registra la asistencia. No registra pagos.
-- Las funciones son públicas (anon) pero devuelven solo nombre de pila y
-- datos de la cuota, y limitan los intentos fallidos de DNI.
-- =====================================================================

alter table public.gyms
  add column qr_token text not null unique default encode(gen_random_bytes(9), 'hex'),
  add column qr_activo boolean not null default true;

-- Celulares vinculados a un socio
create table public.socio_dispositivos (
  token uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  socio_id uuid not null references public.socios (id) on delete cascade,
  created_at timestamptz not null default now(),
  ultimo_uso timestamptz not null default now()
);
create index on public.socio_dispositivos (socio_id);
alter table public.socio_dispositivos enable row level security;
-- Sin políticas: solo se accede por las funciones de abajo.

-- Intentos fallidos de DNI (para frenar a quien pruebe DNIs al azar)
create table public.qr_intentos_fallidos (
  id bigint generated always as identity primary key,
  gym_id uuid not null references public.gyms (id) on delete cascade,
  fecha timestamptz not null default now()
);
create index on public.qr_intentos_fallidos (gym_id, fecha desc);
alter table public.qr_intentos_fallidos enable row level security;

-- Datos públicos del gimnasio a partir del token del QR
create or replace function public.qr_gimnasio(p_token text)
returns table (id uuid, nombre text, activo boolean)
language sql stable security definer set search_path = public as $$
  select id, nombre, qr_activo from gyms where qr_token = p_token
$$;

-- Registra la llegada y devuelve solo lo necesario para mostrar en el celular
create or replace function public._qr_registrar(p_gym gyms, p_socio uuid, p_dispositivo uuid)
returns json language plpgsql security definer set search_path = public as $$
declare
  s socios;
  pl planes;
  v_ultima timestamptz;
  v_ya boolean := false;
begin
  select * into s from socios where id = p_socio and gym_id = p_gym.id for update;
  if not s.activo then
    return json_build_object('ok', false, 'error', 'INACTIVO', 'nombre', split_part(s.nombre, ' ', 1));
  end if;
  select * into pl from planes where id = s.plan_id;

  -- Evita contar dos veces si escanea de nuevo dentro de las 3 horas
  select max(fecha) into v_ultima from asistencias where socio_id = s.id;
  if v_ultima is not null and v_ultima > now() - interval '3 hours' then
    v_ya := true;
  else
    insert into asistencias (gym_id, socio_id, origen, usuario_id) values (p_gym.id, s.id, 'qr', null);
    update socios set
      ultima_asistencia = now(),
      clases_restantes = case when pl.tipo = 'paquete' and coalesce(clases_restantes, 0) > 0 then clases_restantes - 1 else clases_restantes end
    where id = s.id
    returning * into s;
    v_ultima := now();
  end if;

  return json_build_object(
    'ok', true,
    'dispositivo', p_dispositivo,
    'nombre', split_part(s.nombre, ' ', 1),
    'plan_tipo', pl.tipo,
    'vencimiento', s.vencimiento,
    'clases_restantes', s.clases_restantes,
    'dias_gracia', p_gym.dias_gracia,
    'ya_registrado', v_ya,
    'hora', v_ultima
  );
end $$;

-- Primera vez: vincula el celular con el DNI
create or replace function public.qr_vincular(p_token text, p_dni text)
returns json language plpgsql security definer set search_path = public as $$
declare
  g gyms;
  v_socio uuid;
  v_disp uuid;
  v_dni text := regexp_replace(coalesce(p_dni, ''), '\D', '', 'g');
begin
  select * into g from gyms where qr_token = p_token;
  if not found then return json_build_object('ok', false, 'error', 'QR_INVALIDO'); end if;
  if not g.qr_activo then return json_build_object('ok', false, 'error', 'QR_INACTIVO'); end if;

  if (select count(*) from qr_intentos_fallidos where gym_id = g.id and fecha > now() - interval '10 minutes') >= 20 then
    return json_build_object('ok', false, 'error', 'DEMASIADOS_INTENTOS');
  end if;

  select id into v_socio from socios where gym_id = g.id and dni = v_dni;
  if v_socio is null then
    insert into qr_intentos_fallidos (gym_id) values (g.id);
    delete from qr_intentos_fallidos where fecha < now() - interval '1 day';
    return json_build_object('ok', false, 'error', 'NO_ENCONTRADO');
  end if;

  insert into socio_dispositivos (gym_id, socio_id) values (g.id, v_socio) returning token into v_disp;
  return _qr_registrar(g, v_socio, v_disp);
end $$;

-- Las siguientes veces: usa el token guardado en el celular
create or replace function public.qr_ingresar(p_token text, p_dispositivo uuid)
returns json language plpgsql security definer set search_path = public as $$
declare
  g gyms;
  d socio_dispositivos;
begin
  select * into g from gyms where qr_token = p_token;
  if not found then return json_build_object('ok', false, 'error', 'QR_INVALIDO'); end if;
  if not g.qr_activo then return json_build_object('ok', false, 'error', 'QR_INACTIVO'); end if;
  select * into d from socio_dispositivos where token = p_dispositivo and gym_id = g.id;
  if not found then return json_build_object('ok', false, 'error', 'DISPOSITIVO_DESCONOCIDO'); end if;
  update socio_dispositivos set ultimo_uso = now() where token = d.token;
  return _qr_registrar(g, d.socio_id, d.token);
end $$;

-- "No soy yo": desvincula el celular
create or replace function public.qr_desvincular(p_dispositivo uuid)
returns void language sql security definer set search_path = public as $$
  delete from socio_dispositivos where token = p_dispositivo
$$;

-- Configuración del QR (dueño): genera un QR nuevo e invalida el anterior
create or replace function public.qr_regenerar()
returns text language plpgsql security definer set search_path = public as $$
declare
  yo perfiles := _yo();
  v_token text := encode(gen_random_bytes(9), 'hex');
begin
  if yo.rol <> 'dueno' then raise exception 'SIN_PERMISO'; end if;
  update gyms set qr_token = v_token where id = yo.gym_id;
  insert into auditoria (gym_id, usuario_id, accion, detalle) values (yo.gym_id, yo.id, 'Generó un QR nuevo', 'El QR anterior dejó de funcionar');
  return v_token;
end $$;

revoke execute on function public._qr_registrar(gyms, uuid, uuid) from anon, authenticated, public;
grant execute on function public.qr_gimnasio(text), public.qr_vincular(text, text), public.qr_ingresar(text, uuid), public.qr_desvincular(uuid) to anon, authenticated;
