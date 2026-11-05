-- Prueba 7 (sección 10): sin número y código verificados no se da información del asunto, por ningún canal.
do $$
declare ua uuid := gen_random_uuid(); da uuid; db uuid; c uuid; c2 uuid; a uuid; v uuid; cod text; r jsonb; fallo boolean; i int;
begin
  insert into auth.users (id, email, aud, role) values (ua, 'p7-' || ua || '@ejemplo.invalid', 'authenticated', 'authenticated');
  insert into public.despachos (nombre) values ('Prueba código A') returning id into da;
  insert into public.despachos (nombre) values ('Prueba código B') returning id into db;
  insert into public.perfiles (id, despacho_id, rol) values (ua, da, 'admin');
  insert into public.clientes (despacho_id, origen, nombre, telefono) values (da, 'manual', 'Rosa', '+34 600 222 333') returning id, codigo into c, cod;
  if cod !~ '^\d{6}$' then raise exception 'FALLO: el código no tiene 6 cifras (%)', cod; end if;
  insert into public.clientes (despacho_id, origen, nombre, telefono) values (db, 'manual', 'Otra', '600999888') returning id into c2;
  insert into public.asuntos (despacho_id, origen, numero, descripcion, cliente_id, fase_cliente) values (da, 'manual', 'A-1', 'Desahucio', c, 'Lanzamiento señalado') returning id into a;
  insert into public.perfiles (id, despacho_id, rol) select ua, da, 'admin' where false;
  insert into public.mensajes (despacho_id, asunto_id, cliente_id, tipo, canal, destinatario, cuerpo, estado, aprobado_por, enviado_en)
    values (da, a, c, 'novedad', 'whatsapp', '34600222333', 'Se mantiene el lanzamiento el 2 de diciembre.', 'enviado', ua, now());
  insert into public.mensajes (despacho_id, asunto_id, cliente_id, tipo, canal, destinatario, cuerpo, estado)
    values (da, a, c, 'novedad', 'whatsapp', '34600222333', 'BORRADOR INTERNO QUE NO DEBE SALIR', 'borrador');

  -- Código correcto desde otro número: nada.
  if public.verificar_cliente(da, '600000000', cod, 'whatsapp') is not null then raise exception 'FALLO: vale el código desde otro número'; end if;
  -- Número correcto con código incorrecto: nada.
  if public.verificar_cliente(da, '600222333', case when cod = '000000' then '111111' else '000000' end, 'whatsapp') is not null then raise exception 'FALLO: vale un código incorrecto'; end if;
  -- El código de un cliente no sirve en otro despacho.
  if public.verificar_cliente(db, '600222333', cod, 'whatsapp') is not null then raise exception 'FALLO: el código vale en otro despacho'; end if;
  -- Número y código correctos: el cliente.
  v := public.verificar_cliente(da, '+34 600 222 333', cod, 'whatsapp');
  if v is distinct from c then raise exception 'FALLO: no verifica con número y código correctos'; end if;
  -- Lo que se cuenta: solo lo aprobado y enviado, nunca borradores.
  r := public.estado_aprobado_cliente(c);
  if r::text not like '%2 de diciembre%' or r::text like '%BORRADOR INTERNO%' then raise exception 'FALLO: estado del cliente incorrecto: %', r; end if;
  -- Tras 3 fallos, se bloquea aunque luego llegue el código bueno.
  for i in 1..3 loop perform public.verificar_cliente(da, '600222333', '000001', 'voz'); end loop;
  if public.verificar_cliente(da, '600222333', cod, 'voz') is not null then raise exception 'FALLO: no se bloquea tras 3 intentos fallidos'; end if;
  -- Desde la app o sin sesión no se pueden usar estas funciones.
  perform set_config('request.jwt.claims', '{"role": "anon"}', true);
  execute 'set local role anon';
  fallo := false;
  begin perform public.verificar_cliente(da, '600222333', cod, 'whatsapp'); exception when others then fallo := true; end;
  if not fallo then raise exception 'FALLO: un visitante puede verificar códigos'; end if;
  fallo := false;
  begin perform public.estado_aprobado_cliente(c); exception when others then fallo := true; end;
  if not fallo then raise exception 'FALLO: un visitante puede leer el estado de un asunto'; end if;
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  fallo := false;
  begin perform public.estado_aprobado_cliente(c); exception when others then fallo := true; end;
  if not fallo then raise exception 'FALLO: la app puede llamar a estado_aprobado_cliente'; end if;
  execute 'reset role';
  raise exception 'PRUEBAS_OK: sin número y código verificados no hay información';
end $$;
