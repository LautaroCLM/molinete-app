-- Panel de administración de la plataforma (/admin): solo para el dueño del negocio.
-- Las operaciones del panel usan la clave secreta del servidor; esta migración agrega
-- la lista de administradores y las funciones de alta con el perfil completo del gimnasio.

create table public.plataforma_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
-- Sin políticas: no se lee ni se escribe desde la API. Solo con la clave secreta o el SQL Editor.
alter table public.plataforma_admins enable row level security;

-- ¿El usuario de la sesión es administrador de la plataforma?
create or replace function public.es_superadmin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from plataforma_admins where user_id = auth.uid())
$$;
revoke all on function public.es_superadmin() from public, anon;
grant execute on function public.es_superadmin() to authenticated;

-- Alta de gimnasio con su perfil completo y su dueño (el usuario de Auth ya existe).
drop function if exists public.crear_gimnasio_admin(text, text, text, text);
create or replace function public.crear_gimnasio_admin(
  p_email text, p_nombre_gym text, p_nombre text, p_apellido text default '',
  p_direccion text default '', p_localidad text default '', p_telefono text default '', p_email_gym text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(trim(p_email));
  v_user uuid;
  v_gym uuid;
begin
  if coalesce(trim(p_nombre_gym), '') = '' or coalesce(trim(p_nombre), '') = '' then
    raise exception 'DATOS_INCOMPLETOS' using hint = 'Hace falta el nombre del gimnasio y el del dueño.';
  end if;
  select id into v_user from auth.users where lower(email) = v_email;
  if v_user is null then
    raise exception 'USUARIO_INEXISTENTE' using hint = 'Creá primero el usuario en Authentication -> Users.';
  end if;
  if exists (select 1 from perfiles where id = v_user) then
    raise exception 'YA_TIENE_GIMNASIO' using hint = 'Ese usuario ya pertenece a un gimnasio.';
  end if;

  insert into gyms (nombre, direccion, localidad, telefono, email)
  values (trim(p_nombre_gym), trim(coalesce(p_direccion, '')), trim(coalesce(p_localidad, '')),
          trim(coalesce(p_telefono, '')), coalesce(nullif(trim(p_email_gym), ''), v_email))
  returning id into v_gym;
  insert into perfiles (id, gym_id, nombre, apellido, email, rol)
  values (v_user, v_gym, trim(p_nombre), trim(coalesce(p_apellido, '')), v_email, 'dueno');
  insert into planes (gym_id, nombre, tipo, precio, duracion_dias) values
    (v_gym, 'Mensual', 'mensual', 35000, 30),
    (v_gym, 'Clase suelta', 'por_clase', 6000, null);
  insert into auditoria (gym_id, usuario_id, accion, detalle)
  values (v_gym, v_user, 'Creó el gimnasio', trim(p_nombre_gym));
  return v_gym;
end $$;
revoke all on function public.crear_gimnasio_admin(text, text, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.crear_gimnasio_admin(text, text, text, text, text, text, text, text) to service_role;

-- Alta de un empleado (o de otro dueño) en un gimnasio existente.
create or replace function public.agregar_empleado_admin(
  p_gym uuid, p_email text, p_nombre text, p_apellido text default '', p_rol text default 'recepcionista'
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(trim(p_email));
  v_user uuid;
begin
  if p_rol not in ('dueno', 'recepcionista') then raise exception 'ROL_INVALIDO'; end if;
  if coalesce(trim(p_nombre), '') = '' then raise exception 'DATOS_INCOMPLETOS'; end if;
  if not exists (select 1 from gyms where id = p_gym) then raise exception 'GIMNASIO_INEXISTENTE'; end if;
  select id into v_user from auth.users where lower(email) = v_email;
  if v_user is null then raise exception 'USUARIO_INEXISTENTE'; end if;
  if exists (select 1 from perfiles where id = v_user) then raise exception 'YA_TIENE_GIMNASIO'; end if;

  insert into perfiles (id, gym_id, nombre, apellido, email, rol)
  values (v_user, p_gym, trim(p_nombre), trim(coalesce(p_apellido, '')), v_email, p_rol);
  insert into auditoria (gym_id, usuario_id, accion, detalle)
  values (p_gym, null, 'Alta de usuario', trim(p_nombre) || ' ' || trim(coalesce(p_apellido, '')) || ' · ' || case p_rol when 'dueno' then 'Dueño' else 'Recepción' end);
end $$;
revoke all on function public.agregar_empleado_admin(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.agregar_empleado_admin(uuid, text, text, text, text) to service_role;
