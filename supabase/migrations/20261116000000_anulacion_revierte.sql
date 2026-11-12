-- Anular un cobro o una venta ahora deshace sus efectos:
--  * cobro: el socio vuelve a su plan, vencimiento, clases y estado anteriores;
--  * venta: el stock vuelve a los productos (queda un movimiento de stock "anulacion").
-- Los movimientos nunca se borran: se marcan anulados con motivo.

-- Foto del socio antes de cada cobro (para poder deshacerlo)
alter table public.pagos
  add column snapshot boolean not null default false,
  add column plan_anterior uuid references public.planes (id),
  add column vencimiento_anterior date,
  add column clases_anterior int,
  add column activo_anterior boolean;

-- Qué movimiento de caja originó cada línea de stock, y el nuevo tipo "anulacion"
alter table public.movimientos_stock
  add column movimiento_id uuid references public.movimientos (id);
alter table public.movimientos_stock drop constraint movimientos_stock_tipo_check;
alter table public.movimientos_stock
  add constraint movimientos_stock_tipo_check check (tipo in ('entrada', 'venta', 'ajuste', 'anulacion'));
create index on public.movimientos_stock (movimiento_id);

-- ---------------------------------------------------------------------
-- cobrar: guarda la foto del socio antes de modificarlo
-- ---------------------------------------------------------------------
create or replace function public.cobrar(p_socio uuid, p_plan uuid, p_monto numeric, p_medio text)
returns json language plpgsql security definer set search_path = public as $$
declare
  yo perfiles := _yo();
  g gyms;
  s socios;
  pl planes;
  v_caja uuid;
  v_mov uuid;
  v_pago uuid;
  v_venc date;
  v_hoy date;
begin
  select * into g from gyms where id = yo.gym_id;
  select * into s from socios where id = p_socio and gym_id = yo.gym_id for update;
  if not found then raise exception 'SOCIO_INEXISTENTE'; end if;
  select * into pl from planes where id = p_plan and gym_id = yo.gym_id and activo;
  if not found then raise exception 'PLAN_INEXISTENTE'; end if;
  if p_monto is null or p_monto <= 0 then raise exception 'MONTO_INVALIDO'; end if;
  v_caja := _caja_abierta(yo.id);
  if v_caja is null then raise exception 'SIN_CAJA'; end if;

  v_hoy := (now() at time zone g.zona_horaria)::date;
  v_venc := calcular_vencimiento(pl.tipo, pl.duracion_dias, g.venc_tipo, g.venc_dias, g.venc_dia, s.vencimiento, v_hoy);

  insert into movimientos (gym_id, caja_id, tipo, monto, medio, categoria, descripcion, usuario_id)
  values (yo.gym_id, v_caja, 'ingreso', p_monto, p_medio,
          case when pl.tipo = 'por_clase' then 'clase' else 'cuota' end,
          pl.nombre || ' · ' || s.nombre || ' ' || s.apellido, yo.id)
  returning id into v_mov;

  insert into pagos (gym_id, socio_id, plan_id, monto, medio, usuario_id, movimiento_id, vencimiento_hasta,
                     snapshot, plan_anterior, vencimiento_anterior, clases_anterior, activo_anterior)
  values (yo.gym_id, s.id, pl.id, p_monto, p_medio, yo.id, v_mov, v_venc,
          true, s.plan_id, s.vencimiento, s.clases_restantes, s.activo)
  returning id into v_pago;

  update socios set
    plan_id = pl.id,
    activo = true,
    vencimiento = case when pl.tipo in ('por_clase', 'paquete') then null else v_venc end,
    clases_restantes = case when pl.tipo = 'paquete' then coalesce(clases_restantes, 0) + pl.cantidad_clases else null end
  where id = s.id;

  insert into auditoria (gym_id, usuario_id, accion, detalle)
  values (yo.gym_id, yo.id, case when pl.tipo = 'por_clase' then 'Cobró clase' else 'Cobró cuota' end,
          s.nombre || ' ' || s.apellido || ' · ' || pl.nombre || ' · $ ' || p_monto::bigint);

  return json_build_object('pago_id', v_pago, 'vencimiento_hasta', v_venc);
end $$;

-- ---------------------------------------------------------------------
-- vender: cada línea de stock queda atada a su movimiento de caja
-- ---------------------------------------------------------------------
create or replace function public.vender(p_items jsonb, p_medio text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  yo perfiles := _yo();
  v_caja uuid;
  v_mov uuid;
  v_total numeric := 0;
  v_desc text := '';
  it jsonb;
  pr productos;
  v_cant int;
begin
  if jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then raise exception 'SIN_ITEMS'; end if;
  v_caja := _caja_abierta(yo.id);
  if v_caja is null then raise exception 'SIN_CAJA'; end if;

  for it in select * from jsonb_array_elements(p_items) loop
    v_cant := (it ->> 'cantidad')::int;
    if v_cant is null or v_cant <= 0 then raise exception 'CANTIDAD_INVALIDA'; end if;
    select * into pr from productos where id = (it ->> 'productoId')::uuid and gym_id = yo.gym_id and activo for update;
    if not found then raise exception 'PRODUCTO_INEXISTENTE'; end if;
    if pr.stock < v_cant then raise exception 'SIN_STOCK' using detail = pr.nombre; end if;
    update productos set stock = stock - v_cant where id = pr.id;
    v_total := v_total + pr.precio * v_cant;
    v_desc := v_desc || case when v_desc = '' then '' else ', ' end || case when v_cant > 1 then v_cant || ' × ' else '' end || pr.nombre;
  end loop;

  insert into movimientos (gym_id, caja_id, tipo, monto, medio, categoria, descripcion, usuario_id)
  values (yo.gym_id, v_caja, 'ingreso', v_total, p_medio, 'venta_producto', v_desc, yo.id)
  returning id into v_mov;

  insert into movimientos_stock (gym_id, producto_id, tipo, cantidad, usuario_id, nota, movimiento_id)
  select yo.gym_id, (x ->> 'productoId')::uuid, 'venta', -((x ->> 'cantidad')::int), yo.id, '', v_mov
  from jsonb_array_elements(p_items) x;

  insert into auditoria (gym_id, usuario_id, accion, detalle)
  values (yo.gym_id, yo.id, 'Vendió productos', v_desc || ' · $ ' || v_total::bigint);
  return v_mov;
end $$;

-- ---------------------------------------------------------------------
-- anular_movimiento: marca el movimiento y deshace sus efectos
-- ---------------------------------------------------------------------
create or replace function public.anular_movimiento(p_movimiento uuid, p_motivo text)
returns void language plpgsql security definer set search_path = public as $$
declare
  yo perfiles := _yo();
  m movimientos;
  pg pagos;
  s socios;
  pl planes;
  ln movimientos_stock;
  v_efecto text := '';
begin
  if yo.rol <> 'dueno' then raise exception 'SIN_PERMISO'; end if;
  select * into m from movimientos where id = p_movimiento and gym_id = yo.gym_id for update;
  if not found then raise exception 'MOVIMIENTO_INEXISTENTE'; end if;
  if m.anulado_at is not null then raise exception 'YA_ANULADO'; end if;

  -- Cobro: devolver al socio a como estaba antes de pagar
  select * into pg from pagos where movimiento_id = m.id;
  if found and pg.snapshot then
    select * into s from socios where id = pg.socio_id for update;
    -- Hay que deshacer los cobros en orden: primero el último.
    if exists (
      select 1 from pagos p join movimientos mv on mv.id = p.movimiento_id
      where p.socio_id = pg.socio_id and p.id <> pg.id and mv.anulado_at is null and p.fecha > pg.fecha
    ) then
      raise exception 'ANULAR_ANTES_EL_ULTIMO_COBRO';
    end if;
    select * into pl from planes where id = pg.plan_id;
    update socios set
      plan_id = pg.plan_anterior,
      -- si el dueño corrigió el vencimiento a mano después del cobro, se respeta
      vencimiento = case when vencimiento is not distinct from pg.vencimiento_hasta then pg.vencimiento_anterior else vencimiento end,
      clases_restantes = case
        when pl.tipo = 'paquete' then
          case when pg.clases_anterior is null then null
               else greatest(coalesce(clases_restantes, 0) - pl.cantidad_clases, 0) end
        else pg.clases_anterior end,
      activo = pg.activo_anterior
    where id = s.id;
    v_efecto := ' · se revirtió la cuota del socio';
  end if;

  -- Venta: devolver el stock
  for ln in select * from movimientos_stock where movimiento_id = m.id and tipo = 'venta' loop
    update productos set stock = stock - ln.cantidad where id = ln.producto_id; -- cantidad es negativa
    insert into movimientos_stock (gym_id, producto_id, tipo, cantidad, usuario_id, nota, movimiento_id)
    values (yo.gym_id, ln.producto_id, 'anulacion', -ln.cantidad, yo.id, 'Anulación de venta', m.id);
    v_efecto := ' · se devolvió el stock';
  end loop;

  update movimientos set anulado_at = now(), anulado_por = yo.id, motivo_anulacion = trim(p_motivo) where id = m.id;
  insert into auditoria (gym_id, usuario_id, accion, detalle)
  values (yo.gym_id, yo.id, 'Anuló movimiento',
          m.descripcion || ' · $ ' || m.monto::bigint || ' · ' || trim(p_motivo) || v_efecto);
end $$;
