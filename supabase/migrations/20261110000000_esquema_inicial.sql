-- =====================================================================
-- Molinete · Esquema inicial (Etapa 2)
-- Multi-tenant: todo dato de negocio lleva gym_id y está protegido con RLS.
-- Las operaciones de dinero y stock pasan por funciones (RPC) atómicas que
-- validan rol, gimnasio y caja abierta, y dejan registro en auditoría.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------
create table public.gyms (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  direccion text not null default '',
  localidad text not null default '',
  telefono text not null default '',
  email text not null default '',
  logo_url text,
  zona_horaria text not null default 'America/Argentina/Buenos_Aires',
  venc_tipo text not null default 'dias_desde_pago' check (venc_tipo in ('dias_desde_pago', 'dia_fijo')),
  venc_dias int not null default 30 check (venc_dias between 1 and 365),
  venc_dia int not null default 10 check (venc_dia between 1 and 28),
  dias_gracia int not null default 5 check (dias_gracia between 0 and 60),
  dias_inactividad int not null default 15 check (dias_inactividad between 1 and 365),
  created_at timestamptz not null default now()
);

create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  gym_id uuid not null references public.gyms (id) on delete cascade,
  nombre text not null,
  apellido text not null default '',
  email text not null,
  rol text not null check (rol in ('dueno', 'recepcionista')),
  activo boolean not null default true,
  invitacion_pendiente boolean not null default false,
  ultimo_acceso timestamptz,
  created_at timestamptz not null default now()
);
create index on public.perfiles (gym_id);

create table public.planes (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  nombre text not null,
  tipo text not null check (tipo in ('mensual', 'por_clase', 'semanal', 'paquete', 'pase_diario')),
  precio numeric(12, 2) not null check (precio >= 0),
  duracion_dias int check (duracion_dias > 0),
  cantidad_clases int check (cantidad_clases > 0),
  activo boolean not null default true,
  created_at timestamptz not null default now()
);
create index on public.planes (gym_id);

create table public.socios (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  nombre text not null,
  apellido text not null,
  dni text not null check (dni ~ '^\d{7,8}$'),
  telefono text not null default '',
  email text not null default '',
  fecha_alta date not null default current_date,
  observaciones text not null default '',
  plan_id uuid references public.planes (id),
  vencimiento date,
  clases_restantes int,
  activo boolean not null default true,
  ultima_asistencia timestamptz,
  created_at timestamptz not null default now(),
  unique (gym_id, dni)
);
create index on public.socios (gym_id, apellido, nombre);

create table public.cajas (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  usuario_id uuid not null references public.perfiles (id),
  apertura timestamptz not null default now(),
  cierre timestamptz,
  monto_inicial numeric(12, 2) not null check (monto_inicial >= 0),
  monto_contado numeric(12, 2),
  observaciones text not null default ''
);
create index on public.cajas (gym_id, apertura desc);
-- Una sola caja abierta por usuario
create unique index cajas_una_abierta_por_usuario on public.cajas (usuario_id) where cierre is null;

create table public.movimientos (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  caja_id uuid references public.cajas (id),
  tipo text not null check (tipo in ('ingreso', 'egreso')),
  monto numeric(12, 2) not null check (monto > 0),
  medio text not null check (medio in ('efectivo', 'transferencia', 'mercado_pago', 'tarjeta')),
  categoria text not null check (categoria in (
    'cuota', 'clase', 'venta_producto', 'otros_ingresos',
    'gastos_varios', 'sueldos', 'servicios', 'alquiler', 'compra_mercaderia', 'mantenimiento')),
  descripcion text not null,
  fecha timestamptz not null default now(),
  usuario_id uuid not null references public.perfiles (id),
  anulado_at timestamptz,
  anulado_por uuid references public.perfiles (id),
  motivo_anulacion text
);
create index on public.movimientos (gym_id, fecha desc);
create index on public.movimientos (caja_id);

create table public.pagos (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  socio_id uuid not null references public.socios (id) on delete cascade,
  plan_id uuid not null references public.planes (id),
  monto numeric(12, 2) not null,
  medio text not null,
  fecha timestamptz not null default now(),
  usuario_id uuid not null references public.perfiles (id),
  movimiento_id uuid not null references public.movimientos (id),
  vencimiento_hasta date
);
create index on public.pagos (socio_id, fecha desc);

create table public.asistencias (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  socio_id uuid not null references public.socios (id) on delete cascade,
  fecha timestamptz not null default now(),
  origen text not null default 'recepcion' check (origen in ('recepcion', 'qr')),
  usuario_id uuid references public.perfiles (id)
);
create index on public.asistencias (gym_id, fecha desc);
create index on public.asistencias (socio_id, fecha desc);

create table public.productos (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  nombre text not null,
  categoria text not null check (categoria in ('bebidas', 'suplementos', 'snacks', 'merchandising', 'accesorios')),
  costo numeric(12, 2) not null default 0 check (costo >= 0),
  precio numeric(12, 2) not null check (precio > 0),
  stock int not null default 0 check (stock >= 0),
  stock_minimo int not null default 0 check (stock_minimo >= 0),
  activo boolean not null default true,
  created_at timestamptz not null default now()
);
create index on public.productos (gym_id);

create table public.movimientos_stock (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  producto_id uuid not null references public.productos (id) on delete cascade,
  tipo text not null check (tipo in ('entrada', 'venta', 'ajuste')),
  cantidad int not null check (cantidad <> 0),
  fecha timestamptz not null default now(),
  usuario_id uuid not null references public.perfiles (id),
  nota text not null default ''
);
create index on public.movimientos_stock (gym_id, fecha desc);

create table public.auditoria (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  usuario_id uuid references public.perfiles (id),
  accion text not null,
  detalle text not null default '',
  fecha timestamptz not null default now()
);
create index on public.auditoria (gym_id, fecha desc);

-- ---------------------------------------------------------------------
-- Helpers de sesión (security definer para evitar recursión en RLS)
-- ---------------------------------------------------------------------
create or replace function public.mi_gym() returns uuid
language sql stable security definer set search_path = public as $$
  select gym_id from perfiles where id = auth.uid() and activo
$$;

create or replace function public.mi_rol() returns text
language sql stable security definer set search_path = public as $$
  select rol from perfiles where id = auth.uid() and activo
$$;

create or replace function public.es_dueno() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select rol = 'dueno' from perfiles where id = auth.uid() and activo), false)
$$;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.gyms enable row level security;
alter table public.perfiles enable row level security;
alter table public.planes enable row level security;
alter table public.socios enable row level security;
alter table public.cajas enable row level security;
alter table public.movimientos enable row level security;
alter table public.pagos enable row level security;
alter table public.asistencias enable row level security;
alter table public.productos enable row level security;
alter table public.movimientos_stock enable row level security;
alter table public.auditoria enable row level security;

-- Gimnasio: lo ven sus usuarios, lo edita el dueño
create policy gyms_select on public.gyms for select using (id = mi_gym());
create policy gyms_update on public.gyms for update using (id = mi_gym() and es_dueno()) with check (id = mi_gym());

-- Perfiles: se ven los del mismo gimnasio; los gestiona el dueño
create policy perfiles_select on public.perfiles for select using (gym_id = mi_gym() or id = auth.uid());
create policy perfiles_update on public.perfiles for update using (gym_id = mi_gym() and es_dueno()) with check (gym_id = mi_gym());

-- Planes: los ven todos, los edita el dueño
create policy planes_select on public.planes for select using (gym_id = mi_gym());
create policy planes_insert on public.planes for insert with check (gym_id = mi_gym() and es_dueno());
create policy planes_update on public.planes for update using (gym_id = mi_gym() and es_dueno()) with check (gym_id = mi_gym());

-- Socios: alta y edición para todos los roles del gimnasio. No se borran (baja = activo false).
create policy socios_select on public.socios for select using (gym_id = mi_gym());
create policy socios_insert on public.socios for insert with check (gym_id = mi_gym());
create policy socios_update on public.socios for update using (gym_id = mi_gym()) with check (gym_id = mi_gym());

-- Cajas: el dueño ve todas; recepción solo las suyas. Se escriben por RPC.
create policy cajas_select on public.cajas for select using (gym_id = mi_gym() and (es_dueno() or usuario_id = auth.uid()));

-- Movimientos: el dueño ve todos; recepción solo los que cargó. Se escriben por RPC.
create policy movimientos_select on public.movimientos for select using (gym_id = mi_gym() and (es_dueno() or usuario_id = auth.uid()));

-- Pagos y asistencias: historial del socio visible para todo el gimnasio. Se escriben por RPC.
create policy pagos_select on public.pagos for select using (gym_id = mi_gym());
create policy asistencias_select on public.asistencias for select using (gym_id = mi_gym());

-- Productos: los ven todos, los edita el dueño. El stock cambia solo por RPC.
create policy productos_select on public.productos for select using (gym_id = mi_gym());
create policy productos_insert on public.productos for insert with check (gym_id = mi_gym() and es_dueno());
create policy productos_update on public.productos for update using (gym_id = mi_gym() and es_dueno()) with check (gym_id = mi_gym());

create policy movimientos_stock_select on public.movimientos_stock for select using (gym_id = mi_gym());

-- Auditoría: solo lectura para el dueño. Nadie la edita ni la borra.
create policy auditoria_select on public.auditoria for select using (gym_id = mi_gym() and es_dueno());

-- El stock no se puede tocar con un update directo desde la API (solo por RPC,
-- que corren como el dueño de la función y no como "authenticated").
create or replace function public.proteger_stock() returns trigger
language plpgsql as $$
begin
  if new.stock is distinct from old.stock and current_user in ('authenticated', 'anon') then
    raise exception 'STOCK_SOLO_POR_MOVIMIENTO';
  end if;
  return new;
end $$;
create trigger proteger_stock before update on public.productos for each row execute function proteger_stock();

-- El vencimiento y las clases del socio cambian al cobrar. Solo el dueño puede corregirlos a mano.
create or replace function public.proteger_cuota() returns trigger
language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') and not es_dueno() and (
     new.vencimiento is distinct from old.vencimiento
     or new.clases_restantes is distinct from old.clases_restantes
     or new.ultima_asistencia is distinct from old.ultima_asistencia) then
    raise exception 'CUOTA_SOLO_POR_COBRO';
  end if;
  return new;
end $$;
create trigger proteger_cuota_upd before update on public.socios for each row execute function proteger_cuota();

-- ---------------------------------------------------------------------
-- Auditoría automática de altas y cambios
-- ---------------------------------------------------------------------
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
      v_accion := case
        when tg_op = 'INSERT' then 'Dio de alta un socio'
        when old.activo and not new.activo then 'Dio de baja un socio'
        when not old.activo and new.activo then 'Reactivó un socio'
        else 'Editó datos de un socio' end;
    when 'planes' then
      v_detalle := new.nombre;
      v_accion := case when tg_op = 'INSERT' then 'Creó un plan'
        when old.precio <> new.precio then 'Cambió precio de plan'
        else 'Editó un plan' end;
      if tg_op = 'UPDATE' and old.precio <> new.precio then
        v_detalle := new.nombre || ': $ ' || old.precio::bigint || ' → $ ' || new.precio::bigint;
      end if;
    when 'productos' then
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

create trigger auditar_socios after insert or update on public.socios for each row execute function auditar_cambios();
create trigger auditar_planes after insert or update on public.planes for each row execute function auditar_cambios();
create trigger auditar_productos after insert or update on public.productos for each row execute function auditar_cambios();
create trigger auditar_gyms after update on public.gyms for each row execute function auditar_cambios();
create trigger auditar_perfiles after update on public.perfiles for each row execute function auditar_cambios();

-- ---------------------------------------------------------------------
-- Reglas de negocio
-- ---------------------------------------------------------------------

-- Debe coincidir con calcularNuevoVencimiento() en src/lib/domain/cuota.ts
create or replace function public.calcular_vencimiento(
  p_tipo text, p_duracion int, p_venc_tipo text, p_venc_dias int, p_venc_dia int,
  p_actual date, p_hoy date
) returns date language plpgsql immutable as $$
declare
  v_base date;
  v_cand date;
begin
  if p_tipo in ('por_clase', 'paquete') then return null; end if;
  v_base := case when p_actual is not null and p_actual > p_hoy then p_actual else p_hoy end;
  if p_tipo = 'mensual' and p_venc_tipo = 'dia_fijo' then
    v_cand := make_date(extract(year from v_base)::int, extract(month from v_base)::int, p_venc_dia);
    if v_cand > v_base then return v_cand; end if;
    return (v_cand + interval '1 month')::date;
  end if;
  if p_tipo = 'mensual' and p_venc_tipo = 'dias_desde_pago' then
    return v_base + p_venc_dias;
  end if;
  return v_base + coalesce(p_duracion, 1);
end $$;

-- Contexto del usuario que llama: perfil activo o error
create or replace function public._yo() returns public.perfiles
language plpgsql stable security definer set search_path = public as $$
declare v perfiles;
begin
  select * into v from perfiles where id = auth.uid() and activo;
  if not found then raise exception 'SIN_SESION' using hint = 'Tu usuario no está activo en ningún gimnasio.'; end if;
  return v;
end $$;

create or replace function public._caja_abierta(p_usuario uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select id from cajas where usuario_id = p_usuario and cierre is null
$$;

-- Registro de gimnasio nuevo: el usuario recién creado queda como dueño
create or replace function public.crear_gimnasio(p_nombre_gym text, p_nombre text, p_apellido text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_gym uuid;
  v_email text;
begin
  if auth.uid() is null then raise exception 'SIN_SESION'; end if;
  if exists (select 1 from perfiles where id = auth.uid()) then
    raise exception 'YA_TIENE_GIMNASIO';
  end if;
  select email into v_email from auth.users where id = auth.uid();
  insert into gyms (nombre, email) values (trim(p_nombre_gym), coalesce(v_email, '')) returning id into v_gym;
  insert into perfiles (id, gym_id, nombre, apellido, email, rol, ultimo_acceso)
  values (auth.uid(), v_gym, trim(p_nombre), trim(p_apellido), coalesce(v_email, ''), 'dueno', now());
  insert into planes (gym_id, nombre, tipo, precio, duracion_dias) values
    (v_gym, 'Mensual', 'mensual', 35000, 30),
    (v_gym, 'Clase suelta', 'por_clase', 6000, null);
  insert into auditoria (gym_id, usuario_id, accion, detalle) values (v_gym, auth.uid(), 'Creó el gimnasio', trim(p_nombre_gym));
  return v_gym;
end $$;

-- Cobro de cuota, clase o paquete: genera movimiento de caja, pago y actualiza al socio
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

  insert into pagos (gym_id, socio_id, plan_id, monto, medio, usuario_id, movimiento_id, vencimiento_hasta)
  values (yo.gym_id, s.id, pl.id, p_monto, p_medio, yo.id, v_mov, v_venc)
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

-- Llegada de un socio (recepción o QR)
create or replace function public.registrar_asistencia(p_socio uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  yo perfiles := _yo();
  s socios;
  pl planes;
  v_id uuid;
begin
  select * into s from socios where id = p_socio and gym_id = yo.gym_id for update;
  if not found then raise exception 'SOCIO_INEXISTENTE'; end if;
  select * into pl from planes where id = s.plan_id;
  insert into asistencias (gym_id, socio_id, origen, usuario_id) values (yo.gym_id, s.id, 'recepcion', yo.id) returning id into v_id;
  update socios set
    ultima_asistencia = now(),
    clases_restantes = case when pl.tipo = 'paquete' and coalesce(clases_restantes, 0) > 0 then clases_restantes - 1 else clases_restantes end
  where id = s.id;
  return v_id;
end $$;

-- Venta de productos: descuenta stock y suma a caja
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

  insert into movimientos_stock (gym_id, producto_id, tipo, cantidad, usuario_id, nota)
  select yo.gym_id, (x ->> 'productoId')::uuid, 'venta', -((x ->> 'cantidad')::int), yo.id, ''
  from jsonb_array_elements(p_items) x;

  insert into auditoria (gym_id, usuario_id, accion, detalle)
  values (yo.gym_id, yo.id, 'Vendió productos', v_desc || ' · $ ' || v_total::bigint);
  return v_mov;
end $$;

create or replace function public.abrir_caja(p_monto_inicial numeric, p_observaciones text default '')
returns uuid language plpgsql security definer set search_path = public as $$
declare
  yo perfiles := _yo();
  v_id uuid;
begin
  if _caja_abierta(yo.id) is not null then raise exception 'CAJA_YA_ABIERTA'; end if;
  insert into cajas (gym_id, usuario_id, monto_inicial, observaciones)
  values (yo.gym_id, yo.id, p_monto_inicial, coalesce(p_observaciones, ''))
  returning id into v_id;
  insert into auditoria (gym_id, usuario_id, accion, detalle) values (yo.gym_id, yo.id, 'Abrió caja', 'Efectivo inicial $ ' || p_monto_inicial::bigint);
  return v_id;
end $$;

create or replace function public.cerrar_caja(p_caja uuid, p_monto_contado numeric, p_observaciones text default '')
returns numeric language plpgsql security definer set search_path = public as $$
declare
  yo perfiles := _yo();
  c cajas;
  v_esperado numeric;
begin
  select * into c from cajas where id = p_caja and gym_id = yo.gym_id and cierre is null for update;
  if not found then raise exception 'CAJA_INEXISTENTE'; end if;
  if c.usuario_id <> yo.id and yo.rol <> 'dueno' then raise exception 'SIN_PERMISO'; end if;
  select c.monto_inicial + coalesce(sum(case when tipo = 'ingreso' then monto else -monto end), 0)
    into v_esperado from movimientos where caja_id = c.id and medio = 'efectivo' and anulado_at is null;
  update cajas set cierre = now(), monto_contado = p_monto_contado, observaciones = coalesce(p_observaciones, '') where id = c.id;
  insert into auditoria (gym_id, usuario_id, accion, detalle)
  values (yo.gym_id, yo.id, 'Cerró caja', 'Esperado $ ' || v_esperado::bigint || ' · contado $ ' || p_monto_contado::bigint);
  return p_monto_contado - v_esperado;
end $$;

-- Ingresos/egresos manuales. Sin caja (administración) solo el dueño.
create or replace function public.registrar_movimiento(
  p_tipo text, p_categoria text, p_monto numeric, p_medio text, p_descripcion text, p_sin_caja boolean default false
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  yo perfiles := _yo();
  v_caja uuid;
  v_id uuid;
begin
  if p_categoria in ('cuota', 'clase', 'venta_producto') then raise exception 'CATEGORIA_INVALIDA'; end if;
  if p_sin_caja then
    if yo.rol <> 'dueno' then raise exception 'SIN_PERMISO'; end if;
  else
    v_caja := _caja_abierta(yo.id);
    if v_caja is null then raise exception 'SIN_CAJA'; end if;
  end if;
  insert into movimientos (gym_id, caja_id, tipo, monto, medio, categoria, descripcion, usuario_id)
  values (yo.gym_id, v_caja, p_tipo, p_monto, p_medio, p_categoria, trim(p_descripcion), yo.id)
  returning id into v_id;
  insert into auditoria (gym_id, usuario_id, accion, detalle)
  values (yo.gym_id, yo.id, case when p_tipo = 'ingreso' then 'Registró ingreso' else 'Registró egreso' end,
          trim(p_descripcion) || ' · $ ' || p_monto::bigint);
  return v_id;
end $$;

-- Los movimientos no se borran: se anulan dejando registro (solo dueño)
create or replace function public.anular_movimiento(p_movimiento uuid, p_motivo text)
returns void language plpgsql security definer set search_path = public as $$
declare
  yo perfiles := _yo();
  m movimientos;
begin
  if yo.rol <> 'dueno' then raise exception 'SIN_PERMISO'; end if;
  select * into m from movimientos where id = p_movimiento and gym_id = yo.gym_id for update;
  if not found then raise exception 'MOVIMIENTO_INEXISTENTE'; end if;
  if m.anulado_at is not null then raise exception 'YA_ANULADO'; end if;
  update movimientos set anulado_at = now(), anulado_por = yo.id, motivo_anulacion = trim(p_motivo) where id = m.id;
  insert into auditoria (gym_id, usuario_id, accion, detalle)
  values (yo.gym_id, yo.id, 'Anuló movimiento', m.descripcion || ' · $ ' || m.monto::bigint || ' · ' || trim(p_motivo));
end $$;

-- Entradas de mercadería y ajustes de stock
create or replace function public.ajustar_stock(p_producto uuid, p_tipo text, p_cantidad int, p_nota text)
returns int language plpgsql security definer set search_path = public as $$
declare
  yo perfiles := _yo();
  pr productos;
begin
  if p_tipo not in ('entrada', 'ajuste') or p_cantidad = 0 then raise exception 'AJUSTE_INVALIDO'; end if;
  if p_tipo = 'entrada' and p_cantidad < 0 then raise exception 'AJUSTE_INVALIDO'; end if;
  select * into pr from productos where id = p_producto and gym_id = yo.gym_id for update;
  if not found then raise exception 'PRODUCTO_INEXISTENTE'; end if;
  if pr.stock + p_cantidad < 0 then raise exception 'SIN_STOCK' using detail = pr.nombre; end if;
  update productos set stock = stock + p_cantidad where id = pr.id;
  insert into movimientos_stock (gym_id, producto_id, tipo, cantidad, usuario_id, nota)
  values (yo.gym_id, pr.id, p_tipo, p_cantidad, yo.id, trim(p_nota));
  insert into auditoria (gym_id, usuario_id, accion, detalle)
  values (yo.gym_id, yo.id, case when p_tipo = 'entrada' then 'Cargó mercadería' else 'Ajustó stock' end,
          pr.nombre || ': ' || case when p_cantidad > 0 then '+' else '' end || p_cantidad || ' (' || trim(p_nota) || ')');
  return pr.stock + p_cantidad;
end $$;

-- ---------------------------------------------------------------------
-- Consultas agregadas (security invoker: respetan RLS)
-- ---------------------------------------------------------------------
create or replace function public.resumen_movimientos(p_desde timestamptz, p_hasta timestamptz default now())
returns table (tipo text, medio text, categoria text, total numeric)
language sql stable as $$
  select tipo, medio, categoria, sum(monto)
  from movimientos
  where gym_id = mi_gym() and anulado_at is null and fecha >= p_desde and fecha <= p_hasta
  group by tipo, medio, categoria
$$;

create or replace function public.movimientos_por_dia(p_desde timestamptz, p_hasta timestamptz default now())
returns table (dia date, ingresos numeric, egresos numeric)
language sql stable as $$
  select (m.fecha at time zone g.zona_horaria)::date,
         coalesce(sum(m.monto) filter (where m.tipo = 'ingreso'), 0),
         coalesce(sum(m.monto) filter (where m.tipo = 'egreso'), 0)
  from movimientos m join gyms g on g.id = m.gym_id
  where m.gym_id = mi_gym() and m.anulado_at is null and m.fecha >= p_desde and m.fecha <= p_hasta
  group by 1 order by 1
$$;

create or replace function public.asistencias_dia_hora(p_desde timestamptz)
returns table (dow int, hora int, cantidad int)
language sql stable as $$
  select extract(dow from a.fecha at time zone g.zona_horaria)::int,
         extract(hour from a.fecha at time zone g.zona_horaria)::int,
         count(*)::int
  from asistencias a join gyms g on g.id = a.gym_id
  where a.gym_id = mi_gym() and a.fecha >= p_desde
  group by 1, 2
$$;

create or replace function public.ventas_por_producto(p_desde timestamptz)
returns table (producto_id uuid, unidades int)
language sql stable as $$
  select producto_id, (-sum(cantidad))::int
  from movimientos_stock
  where gym_id = mi_gym() and tipo = 'venta' and fecha >= p_desde
  group by producto_id
$$;

-- Funciones internas: no expuestas por la API
revoke execute on function public._yo() from anon, authenticated, public;
revoke execute on function public._caja_abierta(uuid) from anon, authenticated, public;
revoke execute on function public.auditar_cambios() from anon, authenticated, public;

-- Al ingresar: registra el último acceso y marca la invitación como aceptada
create or replace function public.registrar_acceso()
returns void language sql security definer set search_path = public as $$
  update perfiles set ultimo_acceso = now(), invitacion_pendiente = false where id = auth.uid()
$$;
