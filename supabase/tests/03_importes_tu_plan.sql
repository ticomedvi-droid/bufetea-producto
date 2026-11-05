-- Prueba 4 (sección 10): el cálculo de «Tu plan» coincide con la calculadora de la web.
do $$
declare r jsonb; ua uuid := gen_random_uuid(); da uuid; i int; c uuid;
begin
  if (public.calcular_importe('professional', 'mensual', 180) ->> 'total')::numeric <> 99.50 then raise exception 'FALLO: Professional 180 → %', public.calcular_importe('professional', 'mensual', 180) ->> 'total'; end if;
  if (public.calcular_importe('starter', 'mensual', 120) ->> 'total')::numeric <> 77.00 then raise exception 'FALLO: Starter 120 → %', public.calcular_importe('starter', 'mensual', 120) ->> 'total'; end if;
  if (public.calcular_importe('business', 'mensual', 500) ->> 'total')::numeric <> 179.00 then raise exception 'FALLO: Business 500 → %', public.calcular_importe('business', 'mensual', 500) ->> 'total'; end if;
  if (public.calcular_importe('professional', 'anual', 180) ->> 'total')::numeric <> 84.67 then raise exception 'FALLO: Professional anual 180 → %', public.calcular_importe('professional', 'anual', 180) ->> 'total'; end if;
  -- Dentro de lo incluido no hay exceso; los extras incluidos en el plan no se cobran.
  if (public.calcular_importe('professional', 'mensual', 120) ->> 'total')::numeric <> 89.00 then raise exception 'FALLO: Professional 120'; end if;
  if (public.calcular_importe('starter', 'mensual', 50, array['portal']) ->> 'total')::numeric <> 68.00 then raise exception 'FALLO: Starter + Portal'; end if;
  if (public.calcular_importe('professional', 'mensual', 150, array['portal', 'pay']) ->> 'total')::numeric <> 108.00 then raise exception 'FALLO: Professional + Portal + Pay'; end if;
  if (public.calcular_importe('business', 'mensual', 400, array['portal', 'pay', 'voice']) ->> 'total')::numeric <> 188.00 then raise exception 'FALLO: Business + Voice'; end if;

  -- La estimación del despacho usa sus asuntos activos reales: 180 abiertos con cliente, más uno cerrado, uno sin cliente y uno duplicado que no cuentan.
  insert into auth.users (id, email, aud, role) values (ua, 'prueba-uso-' || ua || '@ejemplo.invalid', 'authenticated', 'authenticated');
  insert into public.despachos (nombre, plan_id) values ('Prueba importes', 'professional') returning id into da;
  insert into public.perfiles (id, despacho_id, rol) values (ua, da, 'admin');
  insert into public.clientes (despacho_id, origen, nombre) values (da, 'manual', 'Cliente') returning id into c;
  for i in 1..180 loop
    insert into public.asuntos (despacho_id, origen, numero, cliente_id) values (da, 'manual', 'P-' || i, c);
  end loop;
  insert into public.asuntos (despacho_id, origen, numero, cliente_id, situacion) values (da, 'manual', 'cerrado', c, 'cerrado');
  insert into public.asuntos (despacho_id, origen, numero) values (da, 'manual', 'sin cliente');
  insert into public.asuntos (despacho_id, origen, numero, cliente_id, duplicado_de)
    select da, 'manual', 'duplicado', c, id from public.asuntos where despacho_id = da and numero = 'P-1';

  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  r := public.mi_estimacion();
  if (r ->> 'asuntos_activos_ahora')::int <> 180 then raise exception 'FALLO: asuntos activos = %', r ->> 'asuntos_activos_ahora'; end if;
  if (r ->> 'total')::numeric <> 99.50 then raise exception 'FALLO: estimación Professional 180 = %', r ->> 'total'; end if;
  perform public.cambiar_plan('professional', 'anual');
  if (public.mi_estimacion() ->> 'total')::numeric <> 84.67 then raise exception 'FALLO: estimación anual = %', public.mi_estimacion() ->> 'total'; end if;

  -- Avisos de uso al 80 % y al 100 %.
  execute 'reset role';
  perform public.registrar_uso();
  if (select count(*) from public.avisos_uso where despacho_id = da) <> 2 then raise exception 'FALLO: no se crean los avisos del 80 %% y el 100 %%'; end if;

  raise exception 'PRUEBAS_OK: importes de Tu plan';
end $$;
