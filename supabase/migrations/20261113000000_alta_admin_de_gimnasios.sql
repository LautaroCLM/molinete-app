-- Los gimnasios ya no se crean por registro público: los da de alta el administrador
-- de la plataforma (vos) en dos pasos desde el panel de Supabase:
--   1) Authentication -> Users -> Add user (email, contraseña, "Auto Confirm User").
--   2) SQL Editor: select crear_gimnasio_admin('email@del.dueno', 'Nombre del gimnasio', 'Nombre', 'Apellido');

drop function if exists public.crear_gimnasio(text, text, text);

create or replace function public.crear_gimnasio_admin(
  p_email text, p_nombre_gym text, p_nombre text, p_apellido text default ''
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

  insert into gyms (nombre, email) values (trim(p_nombre_gym), v_email) returning id into v_gym;
  insert into perfiles (id, gym_id, nombre, apellido, email, rol)
  values (v_user, v_gym, trim(p_nombre), trim(coalesce(p_apellido, '')), v_email, 'dueno');
  insert into planes (gym_id, nombre, tipo, precio, duracion_dias) values
    (v_gym, 'Mensual', 'mensual', 35000, 30),
    (v_gym, 'Clase suelta', 'por_clase', 6000, null);
  insert into auditoria (gym_id, usuario_id, accion, detalle)
  values (v_gym, v_user, 'Creó el gimnasio', trim(p_nombre_gym));
  return v_gym;
end $$;

-- Solo el administrador (SQL Editor / clave secreta). Nadie desde la app.
revoke all on function public.crear_gimnasio_admin(text, text, text, text) from public, anon, authenticated;
grant execute on function public.crear_gimnasio_admin(text, text, text, text) to service_role;
