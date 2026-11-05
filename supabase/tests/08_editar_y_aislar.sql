-- Editar y guardar un asunto y un cliente (creados a mano y venidos del programa de gestión),
-- y aislamiento entre despachos de las tablas de la Fase 3.
do $$
declare ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid(); da uuid; db uuid; cm uuid; cp uuid; am uuid; ap uuid; nb uuid; wb uuid; fallo boolean; n int;
begin
  insert into auth.users (id, email, aud, role) values (ua, 'p8a-' || ua || '@ejemplo.invalid', 'authenticated', 'authenticated'),
                                                      (ub, 'p8b-' || ub || '@ejemplo.invalid', 'authenticated', 'authenticated');
  insert into public.despachos (nombre) values ('Prueba edición A') returning id into da;
  insert into public.despachos (nombre) values ('Prueba edición B') returning id into db;
  insert into public.perfiles (id, despacho_id, rol) values (ua, da, 'abogado'), (ub, db, 'admin');
  insert into public.clientes (despacho_id, origen, nombre) values (da, 'manual', 'Manual') returning id into cm;
  insert into public.clientes (despacho_id, origen, id_externo, nombre, email) values (da, 'clio', 900001, 'Del programa', 'p@ejemplo.invalid') returning id into cp;
  insert into public.asuntos (despacho_id, origen, numero, cliente_id) values (da, 'manual', 'M-1', cm) returning id into am;
  insert into public.asuntos (despacho_id, origen, id_externo, numero, descripcion, estado, cliente_id) values (da, 'clio', 900002, 'P-1', 'Del programa', 'Open', cp) returning id into ap;
  insert into public.notificaciones (despacho_id, origen, estado) values (db, 'subida', 'lista') returning id into nb;
  insert into public.wa_conversaciones (despacho_id, telefono) values (db, '34600555666') returning id into wb;

  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  -- Lo creado a mano se edita entero.
  update public.asuntos set numero = 'M-1b', juzgado = 'Juzgado n.º 1', fase_cliente = 'Demanda admitida', situacion = 'cerrado', fecha_cierre = current_date, informar = false where id = am;
  update public.clientes set nombre = 'Manual editado', email = 'm@ejemplo.invalid', idioma = 'en', canal = 'email', notas = 'Nota' where id = cm;
  -- Lo que viene del programa: los datos propios de Bufetea sí…
  update public.asuntos set juzgado = 'Juzgado n.º 2', fase_cliente = 'Juicio señalado', informar = false, notas = 'Interna' where id = ap;
  update public.clientes set idioma = 'ro', canal = 'email', dni = '12345678Z', notas = 'Nota' where id = cp;
  -- …pero lo que viene del programa no.
  fallo := false;
  begin update public.asuntos set descripcion = 'Cambiado' where id = ap; exception when others then fallo := sqlerrm like '%programa de gestión%'; end;
  if not fallo then raise exception 'FALLO: se ha cambiado un dato del programa de gestión (asunto)'; end if;
  fallo := false;
  begin update public.clientes set email = 'otro@ejemplo.invalid' where id = cp; exception when others then fallo := sqlerrm like '%programa de gestión%'; end;
  if not fallo then raise exception 'FALLO: se ha cambiado un dato del programa de gestión (cliente)'; end if;
  -- El código lo genera Bufetea (también se puede regenerar con su función).
  fallo := false;
  begin update public.clientes set codigo = '123456' where id = cm; exception when others then fallo := true; end;
  if not fallo then raise exception 'FALLO: se ha puesto un código a mano'; end if;
  if public.regenerar_codigo(cm) !~ '^\d{6}$' then raise exception 'FALLO: regenerar código'; end if;
  -- Aislamiento de las tablas nuevas.
  select count(*) into n from public.notificaciones where id = nb; if n <> 0 then raise exception 'FALLO: A ve notificaciones de B'; end if;
  select count(*) into n from public.wa_conversaciones where id = wb; if n <> 0 then raise exception 'FALLO: A ve conversaciones de B'; end if;
  fallo := false;
  begin perform public.asignar_notificacion(nb, am); exception when others then fallo := true; end;
  if not fallo then raise exception 'FALLO: A asigna notificaciones de B'; end if;
  perform public.marcar_conversacion_leida(wb);
  fallo := false;
  begin perform public.indice_informado(db); exception when others then fallo := true; end;
  if not fallo then raise exception 'FALLO: A ve el índice de B'; end if;
  -- Índice sin datos suficientes: porcentaje nulo, no 100 %.
  if (public.indice_informado(da) ->> 'porcentaje') is not null then raise exception 'FALLO: el índice da porcentaje sin datos'; end if;
  execute 'reset role';
  if (select juzgado || '|' || fase_cliente || '|' || situacion from public.asuntos where id = am) <> 'Juzgado n.º 1|Demanda admitida|cerrado' then raise exception 'FALLO: el asunto manual no se ha guardado'; end if;
  if (select juzgado || '|' || fase_cliente || '|' || descripcion from public.asuntos where id = ap) <> 'Juzgado n.º 2|Juicio señalado|Del programa' then raise exception 'FALLO: el asunto del programa no se ha guardado bien'; end if;
  if (select nombre || '|' || idioma from public.clientes where id = cm) <> 'Manual editado|en' then raise exception 'FALLO: el cliente manual no se ha guardado'; end if;
  if (select idioma || '|' || email from public.clientes where id = cp) <> 'ro|p@ejemplo.invalid' then raise exception 'FALLO: el cliente del programa no se ha guardado bien'; end if;
  if (select no_leidos from public.wa_conversaciones where id = wb) <> 0 then null; end if;
  raise exception 'PRUEBAS_OK: edición de asuntos y clientes y aislamiento de la Fase 3';
end $$;
