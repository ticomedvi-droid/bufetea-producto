-- Pruebas 2 y 3 (sección 10): bloqueo de extras por plan en el servidor y cambio de plan.
-- Starter no usa Portal ni Pay; Professional usa Portal pero no Pay; Business usa los dos.
-- Al cambiar de plan, los incluidos se activan o se bloquean solos y lo contratado aparte se conserva.
do $$
declare
  ua uuid := gen_random_uuid(); ux uuid := gen_random_uuid(); da uuid; fallo boolean; v bigint; v2 bigint; n int;
begin
  insert into auth.users (id, email, aud, role) values (ua, 'prueba-plan-' || ua || '@ejemplo.invalid', 'authenticated', 'authenticated'),
                                                      (ux, 'prueba-adm-' || ux || '@ejemplo.invalid', 'authenticated', 'authenticated');
  insert into public.despachos (nombre) values ('Prueba planes') returning id into da;
  insert into public.perfiles (id, despacho_id, rol) values (ua, da, 'admin'), (ux, da, 'administrativo');

  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  -- Starter (valor por defecto)
  if (select plan_id from public.despachos where id = da) <> 'starter' then raise exception 'FALLO: el plan por defecto no es Starter'; end if;
  if public.extra_activo(da, 'portal') then raise exception 'FALLO: Starter tiene Portal'; end if;
  if public.extra_activo(da, 'pay') then raise exception 'FALLO: Starter tiene Pay'; end if;
  fallo := false;
  begin perform public.exigir_extra(da, 'pay'); exception when others then fallo := sqlerrm like 'EXTRA_NO_ACTIVO%'; end;
  if not fallo then raise exception 'FALLO: el servidor no bloquea Pay en Starter'; end if;
  if (select count(*) from public.mis_extras() where activo) <> 0 then raise exception 'FALLO: Starter muestra extras activos'; end if;

  -- Professional
  perform public.cambiar_plan('professional', 'mensual');
  if not public.extra_activo(da, 'portal') then raise exception 'FALLO: Professional no tiene Portal'; end if;
  if public.extra_activo(da, 'pay') then raise exception 'FALLO: Professional tiene Pay'; end if;
  if (select origen from public.mis_extras() where extra_id = 'portal') <> 'incluido' then raise exception 'FALLO: Portal no figura como incluido'; end if;

  -- Business
  perform public.cambiar_plan('business', 'anual');
  if not (public.extra_activo(da, 'portal') and public.extra_activo(da, 'pay')) then raise exception 'FALLO: Business no tiene Portal y Pay'; end if;
  if public.extra_activo(da, 'docs') or public.extra_activo(da, 'voice') then raise exception 'FALLO: Business incluye Docs o Voice'; end if;

  -- Contrata Docs aparte (lo hace el equipo de Bufetea) y baja a Starter: Portal y Pay se bloquean, Docs se conserva.
  execute 'reset role';
  insert into public.despacho_extras (despacho_id, extra_id) values (da, 'docs');
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.cambiar_plan('starter', 'mensual');
  if public.extra_activo(da, 'portal') or public.extra_activo(da, 'pay') then raise exception 'FALLO: al bajar a Starter siguen Portal o Pay'; end if;
  if not public.extra_activo(da, 'docs') then raise exception 'FALLO: al cambiar de plan se ha perdido Docs contratado'; end if;
  if (select origen from public.mis_extras() where extra_id = 'docs') <> 'contratado' then raise exception 'FALLO: Docs no figura como contratado'; end if;
  select count(*) into n from public.cambios_plan where despacho_id = da;
  if n <> 3 then raise exception 'FALLO: no se registran los cambios de plan (%).', n; end if;

  -- Solicitar activación: crea una solicitud, no la duplica y no activa nada.
  v := public.solicitar_activacion('pay', 'Queremos probarlo');
  v2 := public.solicitar_activacion('pay', null);
  if v is null or v <> v2 then raise exception 'FALLO: la solicitud de activación se duplica'; end if;
  if public.extra_activo(da, 'pay') then raise exception 'FALLO: solicitar activa el extra'; end if;
  fallo := false;
  begin perform public.solicitar_activacion('docs'); exception when others then fallo := true; end;
  if not fallo then raise exception 'FALLO: se puede solicitar un extra ya activo'; end if;

  -- Ni la administración ni nadie que no sea titular cambia el plan; nadie se pone extras por su cuenta.
  perform set_config('request.jwt.claims', json_build_object('sub', ux, 'role', 'authenticated')::text, true);
  fallo := false;
  begin perform public.cambiar_plan('business', 'mensual'); exception when others then fallo := true; end;
  if not fallo then raise exception 'FALLO: un administrativo ha cambiado el plan'; end if;
  fallo := false;
  begin insert into public.despacho_extras (despacho_id, extra_id) values (da, 'voice'); exception when others then fallo := true; end;
  if not fallo then raise exception 'FALLO: un usuario se ha activado un extra'; end if;
  fallo := false;
  begin update public.despachos set plan_id = 'business' where id = da; get diagnostics n = row_count; fallo := n = 0; exception when others then fallo := true; end;
  if not fallo then raise exception 'FALLO: un usuario ha cambiado el plan editando la tabla'; end if;

  -- Despacho cancelado: sin extras.
  execute 'reset role';
  update public.despachos set estado = 'cancelado' where id = da;
  if public.extra_activo(da, 'docs') then raise exception 'FALLO: un despacho cancelado conserva extras'; end if;

  raise exception 'PRUEBAS_OK: extras por plan y cambio de plan';
end $$;
