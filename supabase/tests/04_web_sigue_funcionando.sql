-- Prueba 9 (sección 10, parte de base de datos): el formulario de demo, la medición A/B y el contador de fundadores siguen funcionando.
do $$
declare r json; ref uuid := gen_random_uuid(); ok boolean;
begin
  perform set_config('request.jwt.claims', '{"role": "anon"}', true);
  execute 'set local role anon';
  insert into public.solicitudes_demo (ref, nombre, movil, email, acepta_privacidad) values (ref, 'Prueba', '600000000', 'prueba@ejemplo.invalid', true);
  ok := public.completar_solicitud_demo(ref, '{"despacho": "Despacho de prueba", "intereses": ["Notificaciones explicadas"]}'::jsonb);
  if not ok then raise exception 'FALLO: completar_solicitud_demo'; end if;
  insert into public.eventos_web (sesion, variante, evento, pagina) values (gen_random_uuid(), 'a', 'vista', 'index.html');
  r := public.plazas_fundador();
  if (r ->> 'total')::int <> 50 or (r ->> 'ocupadas') is null then raise exception 'FALLO: plazas_fundador → %', r; end if;
  -- Los precios públicos se leen sin sesión (los usa la web y «Tu plan»).
  if (select count(*) from public.planes) <> 3 or (select count(*) from public.extras) <> 4 then raise exception 'FALLO: planes o extras no visibles'; end if;
  execute 'reset role';
  raise exception 'PRUEBAS_OK: web (demo, A/B y fundadores)';
end $$;
