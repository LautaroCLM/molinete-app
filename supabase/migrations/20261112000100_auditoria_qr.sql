-- Al generar un QR nuevo, el trigger de gyms anotaba además "Editó la configuración".
-- qr_regenerar() ya deja su propio registro, así que ese cambio se ignora acá.
create or replace function public.auditar_gym() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;
  if (old.nombre, old.direccion, old.localidad, old.telefono, old.email, old.logo_url,
      old.venc_tipo, old.venc_dias, old.venc_dia, old.dias_gracia, old.dias_inactividad)
     is not distinct from
     (new.nombre, new.direccion, new.localidad, new.telefono, new.email, new.logo_url,
      new.venc_tipo, new.venc_dias, new.venc_dia, new.dias_gracia, new.dias_inactividad)
     and old.qr_activo = new.qr_activo then
    return new;
  end if;
  insert into auditoria (gym_id, usuario_id, accion, detalle)
  values (new.id, auth.uid(),
          case when old.qr_activo <> new.qr_activo
               then case when new.qr_activo then 'Activó el ingreso con QR' else 'Desactivó el ingreso con QR' end
               else 'Editó la configuración del gimnasio' end,
          new.nombre);
  return new;
end $$;
revoke execute on function public.auditar_gym() from anon, authenticated, public;

drop trigger auditar_gyms on public.gyms;
create trigger auditar_gyms after update on public.gyms for each row execute function auditar_gym();
