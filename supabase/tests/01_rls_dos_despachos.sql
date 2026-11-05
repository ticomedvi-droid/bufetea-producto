-- Prueba 1 (sección 10): un despacho no ve ni toca datos de otro.
-- Todo ocurre dentro de un bloque que termina con una excepción: nada se guarda en la base de datos.
do $$
declare
  ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid();
  da uuid; db uuid; ca uuid; cb uuid; xa uuid; xb uuid;
  n int; r jsonb; fallo boolean;
begin
  insert into auth.users (id, email, aud, role) values (ua, 'prueba-a-' || ua || '@ejemplo.invalid', 'authenticated', 'authenticated'),
                                                      (ub, 'prueba-b-' || ub || '@ejemplo.invalid', 'authenticated', 'authenticated');
  insert into public.despachos (nombre) values ('Prueba A') returning id into da;
  insert into public.despachos (nombre) values ('Prueba B') returning id into db;
  insert into public.perfiles (id, despacho_id, rol) values (ua, da, 'admin'), (ub, db, 'admin');
  insert into public.clientes (despacho_id, origen, nombre, email) values (da, 'manual', 'Cliente de A', 'a@ejemplo.invalid') returning id into ca;
  insert into public.clientes (despacho_id, origen, nombre, email) values (db, 'manual', 'Cliente de B', 'b@ejemplo.invalid') returning id into cb;
  insert into public.asuntos (despacho_id, origen, numero, cliente_id) values (da, 'manual', 'A-1', ca) returning id into xa;
  insert into public.asuntos (despacho_id, origen, numero, cliente_id) values (db, 'manual', 'B-1', cb) returning id into xb;
  insert into public.despacho_extras (despacho_id, extra_id) values (db, 'voice');

  -- A partir de aquí, como la persona usuaria del despacho A.
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into n from public.clientes where despacho_id = db;
  if n <> 0 then raise exception 'FALLO: A ve % clientes de B', n; end if;
  select count(*) into n from public.asuntos where despacho_id = db;
  if n <> 0 then raise exception 'FALLO: A ve asuntos de B'; end if;
  select count(*) into n from public.despachos where id = db;
  if n <> 0 then raise exception 'FALLO: A ve el despacho B'; end if;
  select count(*) into n from public.perfiles where despacho_id = db;
  if n <> 0 then raise exception 'FALLO: A ve el equipo de B'; end if;
  select count(*) into n from public.asunto_clientes where despacho_id = db;
  if n <> 0 then raise exception 'FALLO: A ve asunto_clientes de B'; end if;
  select count(*) into n from public.despacho_extras where despacho_id = db;
  if n <> 0 then raise exception 'FALLO: A ve los extras de B'; end if;
  select count(*) into n from public.clientes where id = ca;
  if n <> 1 then raise exception 'FALLO: A no ve su propio cliente'; end if;

  update public.clientes set nombre = 'Cambiado por A' where id = cb;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALLO: A ha editado un cliente de B'; end if;

  fallo := false;
  begin
    insert into public.clientes (despacho_id, origen, nombre) values (db, 'manual', 'Intruso');
  exception when insufficient_privilege or check_violation then fallo := true;
  end;
  if not fallo then raise exception 'FALLO: A ha creado un cliente en B'; end if;

  fallo := false;
  begin
    insert into public.asunto_clientes (asunto_id, cliente_id, despacho_id) values (xb, ca, da);
  exception when insufficient_privilege or check_violation then fallo := true;
  end;
  if not fallo then raise exception 'FALLO: A ha unido su cliente a un asunto de B'; end if;

  fallo := false;
  begin
    update public.clientes set despacho_id = db where id = ca;
  exception when others then fallo := true;
  end;
  if not fallo then raise exception 'FALLO: A ha movido un cliente a B'; end if;

  if public.extra_activo(db, 'voice') then raise exception 'FALLO: A puede consultar los extras de B'; end if;
  if public.asuntos_activos_de(db) <> 0 then raise exception 'FALLO: A puede contar los asuntos de B'; end if;

  fallo := false;
  begin
    perform public.estimacion_mes(db);
  exception when others then fallo := true;
  end;
  if not fallo then raise exception 'FALLO: A ve la estimación de B'; end if;

  r := public.importar_filas('[{"cliente": {"nombre": "Importado por A", "email": "imp@ejemplo.invalid"}, "asunto": {"numero": "A-2"}}]'::jsonb);
  if (r ->> 'clientes_nuevos')::int <> 1 or (r ->> 'asuntos_nuevos')::int <> 1 then raise exception 'FALLO: importación %', r; end if;

  execute 'reset role';
  select count(*) into n from public.clientes where nombre = 'Importado por A' and despacho_id = da;
  if n <> 1 then raise exception 'FALLO: lo importado no ha quedado en A'; end if;
  select count(*) into n from public.clientes where nombre = 'Importado por A' and despacho_id = db;
  if n <> 0 then raise exception 'FALLO: lo importado ha llegado a B'; end if;
  select count(*) into n from public.clientes where id = cb and nombre = 'Cliente de B';
  if n <> 1 then raise exception 'FALLO: el cliente de B ha cambiado'; end if;

  raise exception 'PRUEBAS_OK: RLS entre dos despachos';
end $$;
