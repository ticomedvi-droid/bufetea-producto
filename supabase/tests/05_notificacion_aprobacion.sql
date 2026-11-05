-- Prueba 5 (sección 10): una notificación genera borrador «Por aprobar» y no se envía sin aprobación de un abogado.
do $$
declare ua uuid := gen_random_uuid(); ux uuid := gen_random_uuid(); da uuid; c uuid; a uuid; n uuid; m uuid; fallo boolean;
begin
  insert into auth.users (id, email, aud, role) values (ua, 'p5a-' || ua || '@ejemplo.invalid', 'authenticated', 'authenticated'),
                                                      (ux, 'p5x-' || ux || '@ejemplo.invalid', 'authenticated', 'authenticated');
  insert into public.despachos (nombre) values ('Prueba notificaciones') returning id into da;
  insert into public.perfiles (id, despacho_id, rol) values (ua, da, 'abogado'), (ux, da, 'administrativo');
  insert into public.clientes (despacho_id, origen, nombre, telefono) values (da, 'manual', 'Lucía', '600111222') returning id into c;
  insert into public.asuntos (despacho_id, origen, numero, procedimiento, cliente_id) values (da, 'manual', 'A-1', '412/2026', c) returning id into a;
  -- Lo que hace la función del servidor al procesar el PDF:
  insert into public.notificaciones (despacho_id, asunto_id, origen, estado, tipo_resolucion, resumen, plazo_fecha, lo_que_dice)
    values (da, a, 'subida', 'lista', 'Decreto', 'Demanda admitida.', '2026-12-01', 'Se admite a trámite…') returning id into n;
  insert into public.mensajes (despacho_id, asunto_id, cliente_id, notificacion_id, tipo, canal, destinatario, titulo, cuerpo, cuerpo_es, estado)
    values (da, a, c, n, 'novedad', 'whatsapp', '34600111222', 'Demanda admitida', 'Hola…', 'Hola…', 'borrador') returning id into m;
  if (select estado from public.mensajes where id = m) <> 'borrador' then raise exception 'FALLO: el borrador no queda por aprobar'; end if;

  -- Sin aprobación no sale (ni siquiera desde el servidor).
  fallo := false;
  begin update public.mensajes set estado = 'programado' where id = m; exception when others then fallo := sqlerrm like 'LIMITE%'; end;
  if not fallo then raise exception 'FALLO: un borrador ha salido sin aprobación'; end if;
  fallo := false;
  begin update public.mensajes set estado = 'enviado', enviado_en = now() where id = m; exception when others then fallo := sqlerrm like 'LIMITE%'; end;
  if not fallo then raise exception 'FALLO: un borrador se ha marcado como enviado sin aprobación'; end if;
  -- Una explicación de notificación no puede salir «automática».
  fallo := false;
  begin update public.mensajes set estado = 'programado', auto = true where id = m; exception when others then fallo := sqlerrm like 'LIMITE%'; end;
  if not fallo then raise exception 'FALLO: una notificación ha salido como automática'; end if;
  -- La administración no aprueba lo jurídico.
  fallo := false;
  begin update public.mensajes set estado = 'programado', aprobado_por = ux where id = m; exception when others then fallo := sqlerrm like 'LIMITE%'; end;
  if not fallo then raise exception 'FALLO: un administrativo ha aprobado una notificación'; end if;
  -- Desde la app (RLS) tampoco se puede saltar la aprobación.
  perform set_config('request.jwt.claims', json_build_object('sub', ux, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  fallo := false;
  begin update public.mensajes set estado = 'enviado' where id = m; exception when others then fallo := true; end;
  if not fallo and (select estado from public.mensajes where id = m) = 'enviado' then raise exception 'FALLO: la app ha marcado un mensaje como enviado'; end if;
  execute 'reset role';
  -- Con la aprobación de un abogado, sí, y queda quién y cuándo.
  update public.mensajes set estado = 'programado', aprobado_por = ua where id = m;
  if (select aprobado_en from public.mensajes where id = m) is null then raise exception 'FALLO: no queda registrado cuándo se aprobó'; end if;

  -- «No contárselo» cancela el borrador.
  insert into public.notificaciones (despacho_id, asunto_id, origen, estado) values (da, a, 'subida', 'lista') returning id into n;
  insert into public.mensajes (despacho_id, asunto_id, cliente_id, notificacion_id, tipo, canal, destinatario, cuerpo, estado)
    values (da, a, c, n, 'novedad', 'whatsapp', '34600111222', 'Hola…', 'borrador') returning id into m;
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.no_contar_notificacion(n);
  execute 'reset role';
  if (select estado from public.mensajes where id = m) <> 'cancelado' or (select estado from public.notificaciones where id = n) <> 'no_contar' then
    raise exception 'FALLO: «No contárselo» no cancela el borrador';
  end if;
  raise exception 'PRUEBAS_OK: notificación por aprobar y sin envío sin aprobación';
end $$;
