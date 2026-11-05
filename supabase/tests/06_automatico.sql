-- Prueba 6 (sección 10): lo marcado como automático sale solo y queda registrado como automático con su regla.
do $$
declare ua uuid := gen_random_uuid(); da uuid; c uuid; a uuid; m uuid; fallo boolean;
begin
  insert into auth.users (id, email, aud, role) values (ua, 'p6-' || ua || '@ejemplo.invalid', 'authenticated', 'authenticated');
  insert into public.despachos (nombre) values ('Prueba automático') returning id into da;
  insert into public.perfiles (id, despacho_id, rol) values (ua, da, 'admin');
  insert into public.clientes (despacho_id, origen, nombre, email) values (da, 'manual', 'Pedro', 'pedro@ejemplo.invalid') returning id into c;
  insert into public.asuntos (despacho_id, origen, numero, cliente_id) values (da, 'manual', 'A-1', c) returning id into a;
  insert into public.mensajes (despacho_id, asunto_id, cliente_id, tipo, canal, destinatario, cuerpo, estado, programado_para)
    values (da, a, c, 'recordatorio_semana', 'email', 'pedro@ejemplo.invalid', 'Le recordamos…', 'borrador', now() + interval '3 days') returning id into m;

  -- Sin la regla activa, no puede salir solo.
  fallo := false;
  begin update public.mensajes set estado = 'programado', auto = true where id = m; exception when others then fallo := sqlerrm like 'LIMITE%'; end;
  if not fallo then raise exception 'FALLO: ha salido solo sin regla activa'; end if;

  -- La persona titular activa la regla: el pendiente pasa a salir solo, con la regla registrada.
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.ajustar_envio_auto(array['recordatorio_semana', 'respuesta_codigo']);
  execute 'reset role';
  if (select estado || '/' || auto::text || '/' || coalesce(regla_auto, '-') from public.mensajes where id = m) <> 'programado/true/recordatorio_semana' then
    raise exception 'FALLO: al activar la regla no queda programado como automático (%).', (select estado || '/' || auto::text || '/' || coalesce(regla_auto, '-') from public.mensajes where id = m);
  end if;
  -- Al enviarse, queda registrado como automático, sin aprobador y con su regla.
  update public.mensajes set estado = 'enviando' where id = m;
  update public.mensajes set estado = 'enviado', enviado_en = now() where id = m;
  if (select aprobado_por is null and auto and regla_auto = 'recordatorio_semana' from public.mensajes where id = m) is not true then
    raise exception 'FALLO: el envío automático no queda registrado como automático';
  end if;

  -- Al apagar la regla, lo programado por ella vuelve a esperar aprobación.
  insert into public.mensajes (despacho_id, asunto_id, cliente_id, tipo, canal, destinatario, cuerpo, estado, programado_para, auto)
    values (da, a, c, 'recordatorio_semana', 'email', 'pedro@ejemplo.invalid', 'Otro…', 'programado', now() + interval '5 days', true) returning id into m;
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.ajustar_envio_auto(array['respuesta_codigo']);
  execute 'reset role';
  if (select estado from public.mensajes where id = m) <> 'borrador' then raise exception 'FALLO: al apagar la regla el aviso sigue saliendo solo'; end if;
  -- Las reglas desconocidas se ignoran: no se puede poner «novedad» como automática.
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.ajustar_envio_auto(array['novedad', 'respuesta_codigo']);
  execute 'reset role';
  if (select 'novedad' = any (envio_auto) from public.despachos where id = da) then raise exception 'FALLO: se ha activado «novedad» como automática'; end if;
  raise exception 'PRUEBAS_OK: lo automático sale solo y queda registrado con su regla';
end $$;
