-- gen_random_bytes vive en el esquema "extensions" de Supabase; la función
-- usaba search_path = public y fallaba al generar un QR nuevo.
create or replace function public.qr_regenerar()
returns text language plpgsql security definer set search_path = public as $$
declare
  yo perfiles := _yo();
  v_token text := encode(extensions.gen_random_bytes(9), 'hex');
begin
  if yo.rol <> 'dueno' then raise exception 'SIN_PERMISO'; end if;
  update gyms set qr_token = v_token where id = yo.gym_id;
  insert into auditoria (gym_id, usuario_id, accion, detalle) values (yo.gym_id, yo.id, 'Generó un QR nuevo', 'El QR anterior dejó de funcionar');
  return v_token;
end $$;
