-- Las rutinas propias del socio son privadas: el historial de entrenamientos (que el personal puede leer)
-- no guarda el nombre de la rutina propia ni el de sus días. Se anota como "Rutina propia".
create or replace function public.qr_entrenamiento_guardar(p_token text, p_dispositivo uuid, p_pin text, p_datos jsonb)
returns json language plpgsql security definer set search_path = public as $$
declare
  v json := _qr_auth_pin(p_token, p_dispositivo, p_pin);
  v_socio uuid;
  v_gym uuid;
  v_cliente uuid;
  v_id uuid;
  v_ini timestamptz;
  v_rutina uuid;
  v_propia boolean;
  ej jsonb;
  se jsonb;
  v_nombre text;
  v_previo numeric;
  v_peso numeric;
  v_reps int;
  v_e numeric;
  v_mejor numeric;
  v_mejor_i int;
  i int;
  j int;
  v_total int := 0;
  v_volumen numeric := 0;
  v_records text[] := '{}';
begin
  if (v ->> 'ok')::boolean is not true then return v; end if;
  v_socio := (v ->> 'socio_id')::uuid;
  v_gym := (v ->> 'gym_id')::uuid;

  begin
    v_cliente := (p_datos ->> 'cliente_id')::uuid;
  exception when others then
    return json_build_object('ok', false, 'error', 'DATOS_INVALIDOS');
  end;
  if v_cliente is null or jsonb_typeof(p_datos -> 'ejercicios') <> 'array'
     or jsonb_array_length(p_datos -> 'ejercicios') not between 1 and 40 then
    return json_build_object('ok', false, 'error', 'DATOS_INVALIDOS');
  end if;

  -- Reintento del mismo entrenamiento: devuelve el ya guardado
  select id into v_id from entrenamientos where socio_id = v_socio and cliente_id = v_cliente;
  if found then return json_build_object('ok', true, 'id', v_id, 'repetido', true, 'records', '[]'::json); end if;

  -- Validación de todas las series antes de escribir nada
  for ej in select * from jsonb_array_elements(p_datos -> 'ejercicios') loop
    if length(trim(coalesce(ej ->> 'nombre', ''))) not between 1 and 80
       or jsonb_typeof(ej -> 'series') <> 'array' or jsonb_array_length(ej -> 'series') not between 1 and 20 then
      return json_build_object('ok', false, 'error', 'DATOS_INVALIDOS');
    end if;
    for se in select * from jsonb_array_elements(ej -> 'series') loop
      begin
        v_peso := nullif(se ->> 'peso', '')::numeric;
        v_reps := nullif(se ->> 'reps', '')::int;
      exception when others then
        return json_build_object('ok', false, 'error', 'DATOS_INVALIDOS');
      end;
      if (v_peso is not null and (v_peso < 0 or v_peso > 1000)) or (v_reps is not null and (v_reps < 1 or v_reps > 1000))
         or (v_peso is null and v_reps is null) then
        return json_build_object('ok', false, 'error', 'DATOS_INVALIDOS');
      end if;
      v_total := v_total + 1;
    end loop;
  end loop;

  begin
    v_ini := (p_datos ->> 'iniciado_en')::timestamptz;
  exception when others then
    v_ini := null;
  end;
  if v_ini is null or v_ini > now() or v_ini < now() - interval '24 hours' then v_ini := now(); end if;
  select id, (socio_id is not null) into v_rutina, v_propia from rutinas where id = nullif(p_datos ->> 'rutina_id', '')::uuid and gym_id = v_gym and (socio_id is null or socio_id = v_socio);
  v_propia := coalesce(v_propia, false);

  insert into entrenamientos (gym_id, socio_id, cliente_id, rutina_id, rutina_nombre, dia_nombre, iniciado_en)
  values (v_gym, v_socio, v_cliente, v_rutina,
          case when v_propia then 'Rutina propia' else left(trim(coalesce(p_datos ->> 'rutina_nombre', '')), 80) end,
          case when v_propia then '' else left(trim(coalesce(p_datos ->> 'dia_nombre', '')), 60) end, v_ini)
  returning id into v_id;

  i := 0;
  for ej in select * from jsonb_array_elements(p_datos -> 'ejercicios') loop
    i := i + 1;
    v_nombre := trim(ej ->> 'nombre');
    select coalesce(max(e1rm), 0) into v_previo from entrenamiento_series where socio_id = v_socio and lower(ejercicio) = lower(v_nombre);
    v_mejor := 0; v_mejor_i := 0; j := 0;
    for se in select * from jsonb_array_elements(ej -> 'series') loop
      j := j + 1;
      v_peso := nullif(se ->> 'peso', '')::numeric;
      v_reps := nullif(se ->> 'reps', '')::int;
      v_e := case when v_peso is not null and v_peso > 0 and v_reps is not null then round(v_peso * (1 + v_reps / 30.0), 2) end;
      insert into entrenamiento_series (gym_id, socio_id, entrenamiento_id, ejercicio, orden, serie, peso, repeticiones, e1rm)
      values (v_gym, v_socio, v_id, v_nombre, i, j, v_peso, v_reps, v_e);
      if v_e is not null and v_e > v_mejor then v_mejor := v_e; v_mejor_i := j; end if;
      v_volumen := v_volumen + coalesce(v_peso, 0) * coalesce(v_reps, 0);
    end loop;
    -- Récord: la mejor serie del ejercicio supera la marca anterior (la primera vez no cuenta como récord)
    if v_previo > 0 and v_mejor > v_previo then
      update entrenamiento_series set es_record = true
      where entrenamiento_id = v_id and orden = i and serie = v_mejor_i;
      v_records := v_records || v_nombre;
    end if;
  end loop;

  return json_build_object('ok', true, 'id', v_id, 'series', v_total, 'volumen', v_volumen, 'records', to_json(v_records));
end $$;

update public.entrenamientos e set rutina_nombre = 'Rutina propia', dia_nombre = ''
where exists (select 1 from public.rutinas r where r.id = e.rutina_id and r.socio_id is not null);
