-- =====================================================================
-- Marca del gimnasio en la app del socio
-- * color_acento: color principal (#rrggbb) de la app del socio; null = el de Molinete.
-- * msg_bienvenida: frase corta que ve el socio al abrir su app; null = sin frase.
-- * qr_gimnasio ahora devuelve también logo, color y bienvenida (datos públicos del QR).
-- =====================================================================

alter table public.gyms
  add column color_acento text check (color_acento is null or color_acento ~ '^#[0-9a-fA-F]{6}$'),
  add column msg_bienvenida text check (msg_bienvenida is null or char_length(msg_bienvenida) <= 140);

drop function public.qr_gimnasio(text);
create function public.qr_gimnasio(p_token text)
returns table (id uuid, nombre text, activo boolean, logo_url text, color_acento text, msg_bienvenida text)
language sql stable security definer set search_path = public as $$
  select id, nombre, qr_activo, logo_url, color_acento, msg_bienvenida from gyms where qr_token = p_token
$$;
grant execute on function public.qr_gimnasio(text) to anon, authenticated;
