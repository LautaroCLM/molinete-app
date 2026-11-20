-- =====================================================================
-- Avisos de cuota por WhatsApp (con un clic)
-- * Cada gimnasio puede editar los dos mensajes (por vencer / vencida); null = texto por defecto.
-- * Cada vez que el personal toca "Avisar" queda registrado quién y cuándo, para no avisar dos veces al mismo socio.
-- =====================================================================

alter table public.gyms
  add column msg_por_vencer text,
  add column msg_vencida text;

create table public.recordatorios (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  socio_id uuid not null references public.socios (id) on delete cascade,
  tipo text not null check (tipo in ('por_vencer', 'vencida')),
  usuario_id uuid references public.perfiles (id),
  fecha timestamptz not null default now()
);
create index on public.recordatorios (gym_id, fecha desc);
create index on public.recordatorios (socio_id, fecha desc);

alter table public.recordatorios enable row level security;
create policy recordatorios_select on public.recordatorios for select using (gym_id = mi_gym());
-- Sin políticas de escritura: se registra solo con la función de abajo.

create or replace function public.registrar_aviso(p_socio uuid, p_tipo text)
returns void language plpgsql security definer set search_path = public as $$
declare
  yo perfiles := _yo();
  s socios;
begin
  if yo.rol not in ('dueno', 'recepcionista') then raise exception 'SIN_PERMISO'; end if;
  if p_tipo not in ('por_vencer', 'vencida') then raise exception 'TIPO_INVALIDO'; end if;
  select * into s from socios where id = p_socio and gym_id = yo.gym_id;
  if not found then raise exception 'SOCIO_INEXISTENTE'; end if;
  insert into recordatorios (gym_id, socio_id, tipo, usuario_id) values (yo.gym_id, s.id, p_tipo, yo.id);
  insert into auditoria (gym_id, usuario_id, accion, detalle)
  values (yo.gym_id, yo.id, 'Avisó por WhatsApp', s.nombre || ' ' || s.apellido || ' · ' || case p_tipo when 'por_vencer' then 'cuota por vencer' else 'cuota vencida' end);
end $$;

revoke execute on function public.registrar_aviso(uuid, text) from anon, public;
grant execute on function public.registrar_aviso(uuid, text) to authenticated;
