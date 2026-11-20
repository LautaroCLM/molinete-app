-- =====================================================================
-- Músculos trabajados: series por ejercicio de los últimos N días (solo del propio socio, con PIN).
-- La app cruza cada ejercicio con el catálogo para saber qué músculos trabajó.
-- =====================================================================

create or replace function public.qr_series_por_ejercicio(p_token text, p_dispositivo uuid, p_pin text, p_dias int default 30)
returns json language plpgsql security definer set search_path = public as $$
declare
  v json := _qr_auth_pin(p_token, p_dispositivo, p_pin);
  v_socio uuid;
  v_dias int := least(greatest(coalesce(p_dias, 30), 1), 365);
begin
  if (v ->> 'ok')::boolean is not true then return v; end if;
  v_socio := (v ->> 'socio_id')::uuid;
  return json_build_object('ok', true, 'dias', v_dias, 'ejercicios', coalesce((
    select json_agg(json_build_object('nombre', x.nombre, 'series', x.series) order by x.series desc, x.nombre)
    from (
      select min(es.ejercicio) as nombre, count(*)::int as series
      from entrenamiento_series es join entrenamientos e on e.id = es.entrenamiento_id
      where es.socio_id = v_socio and e.finalizado_en > now() - make_interval(days => v_dias)
      group by lower(es.ejercicio)
    ) x
  ), '[]'::json));
end $$;

revoke execute on function public.qr_series_por_ejercicio(text, uuid, text, int) from public;
grant execute on function public.qr_series_por_ejercicio(text, uuid, text, int) to anon, authenticated;
