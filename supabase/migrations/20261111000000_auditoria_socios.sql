-- La auditoría de socios registraba "Editó datos" cuando un cobro o una llegada
-- actualizaban el vencimiento o la última asistencia. Ahora solo registra
-- ediciones reales de datos personales o del plan.
create or replace function public.auditar_cambios() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_accion text;
  v_detalle text;
begin
  if auth.uid() is null then
    return new; -- cargas de sistema (seed)
  end if;
  case tg_table_name
    when 'socios' then
      v_detalle := new.nombre || ' ' || new.apellido;
      if tg_op = 'INSERT' then
        v_accion := 'Dio de alta un socio';
      elsif old.activo and not new.activo then
        v_accion := 'Dio de baja un socio';
      elsif not old.activo and new.activo then
        v_accion := 'Reactivó un socio';
      elsif (old.nombre, old.apellido, old.dni, old.telefono, old.email, old.observaciones, old.fecha_alta)
            is distinct from (new.nombre, new.apellido, new.dni, new.telefono, new.email, new.observaciones, new.fecha_alta)
         or (old.plan_id is distinct from new.plan_id and old.vencimiento is not distinct from new.vencimiento) then
        v_accion := 'Editó datos de un socio';
      elsif old.vencimiento is distinct from new.vencimiento and old.ultima_asistencia is not distinct from new.ultima_asistencia
            and not exists (select 1 from pagos where socio_id = new.id and fecha > now() - interval '5 seconds') then
        v_accion := 'Corrigió el vencimiento de un socio';
        v_detalle := v_detalle || ': ' || coalesce(old.vencimiento::text, 'sin fecha') || ' → ' || coalesce(new.vencimiento::text, 'sin fecha');
      else
        return new; -- cambios que hacen los cobros y las llegadas (ya auditados ahí)
      end if;
    when 'planes' then
      v_detalle := new.nombre;
      v_accion := case when tg_op = 'INSERT' then 'Creó un plan'
        when old.precio <> new.precio then 'Cambió precio de plan'
        when old.activo <> new.activo then case when new.activo then 'Activó un plan' else 'Desactivó un plan' end
        else 'Editó un plan' end;
      if tg_op = 'UPDATE' and old.precio <> new.precio then
        v_detalle := new.nombre || ': $ ' || old.precio::bigint || ' → $ ' || new.precio::bigint;
      end if;
    when 'productos' then
      if tg_op = 'UPDATE' and (old.nombre, old.categoria, old.costo, old.precio, old.stock_minimo, old.activo)
         is not distinct from (new.nombre, new.categoria, new.costo, new.precio, new.stock_minimo, new.activo) then
        return new; -- solo cambió el stock (auditado por la venta o el ajuste)
      end if;
      v_detalle := new.nombre;
      v_accion := case when tg_op = 'INSERT' then 'Creó un producto' else 'Editó un producto' end;
    when 'gyms' then
      v_detalle := new.nombre;
      v_accion := 'Editó la configuración del gimnasio';
    when 'perfiles' then
      v_detalle := new.nombre || ' ' || new.apellido;
      v_accion := case
        when old.rol <> new.rol then 'Cambió el rol de un usuario'
        when old.activo and not new.activo then 'Desactivó un usuario'
        when not old.activo and new.activo then 'Reactivó un usuario'
        else null end;
      if v_accion is null then return new; end if;
  end case;
  insert into auditoria (gym_id, usuario_id, accion, detalle)
  values (case when tg_table_name = 'gyms' then new.id else new.gym_id end, auth.uid(), v_accion, v_detalle);
  return new;
end $$;

revoke execute on function public.auditar_cambios() from anon, authenticated, public;

-- Limpia los registros erróneos que dejó la versión anterior
delete from public.auditoria a
where a.accion = 'Editó datos de un socio'
  and exists (
    select 1 from public.auditoria b
    where b.gym_id = a.gym_id and b.usuario_id = a.usuario_id
      and b.accion in ('Cobró cuota', 'Cobró clase')
      and abs(extract(epoch from b.fecha - a.fecha)) < 2
  );
