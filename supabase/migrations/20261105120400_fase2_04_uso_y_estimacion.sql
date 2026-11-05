-- Fase 2 · Migración 4 · Asuntos activos, uso diario, avisos al 80 % y al 100 % e importe estimado del mes. Solo añade.

-- Asunto activo: expediente abierto, no eliminado ni duplicado, con al menos un cliente asociado (no eliminado).
create or replace function public.asuntos_activos_de(p_despacho uuid)
returns int language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.asuntos a
   where a.despacho_id = p_despacho
     and (p_despacho = public.mi_despacho() or public.es_bufetea_admin() or public.llamada_interna())
     and not a.eliminado and a.situacion = 'abierto' and a.duplicado_de is null
     and exists (select 1 from public.asunto_clientes ac join public.clientes c on c.id = ac.cliente_id
                  where ac.asunto_id = a.id and not c.eliminado)
$$;

create table if not exists public.uso_diario (
  despacho_id uuid not null references public.despachos(id) on delete cascade,
  fecha date not null,
  asuntos_activos int not null check (asuntos_activos >= 0),
  registrado_en timestamptz not null default now(),
  primary key (despacho_id, fecha)
);
alter table public.uso_diario enable row level security;
create policy "ver mi uso" on public.uso_diario for select to authenticated
  using (despacho_id = (select public.mi_despacho()) or (select public.es_bufetea_admin()));

create table if not exists public.avisos_uso (
  despacho_id uuid not null references public.despachos(id) on delete cascade,
  mes date not null,
  umbral int not null check (umbral in (80, 100)),
  asuntos_activos int not null,
  incluidos int not null,
  creado_en timestamptz not null default now(),
  visto_en timestamptz,
  primary key (despacho_id, mes, umbral)
);
alter table public.avisos_uso enable row level security;
create policy "ver mis avisos de uso" on public.avisos_uso for select to authenticated
  using (despacho_id = (select public.mi_despacho()) or (select public.es_bufetea_admin()));

create or replace function public.mes_actual()
returns date language sql stable set search_path = '' as $$
  select date_trunc('month', now() at time zone 'Europe/Madrid')::date
$$;

-- Se ejecuta a diario (pg_cron): guarda los asuntos activos de cada despacho y crea los avisos del 80 % y el 100 %.
create or replace function public.registrar_uso()
returns int language plpgsql security definer set search_path = '' as $$
declare d record; n int; v_max int; v_incl int; v_hoy date := (now() at time zone 'Europe/Madrid')::date; total int := 0;
begin
  for d in select id, plan_id from public.despachos where estado <> 'cancelado' loop
    n := public.asuntos_activos_de(d.id);
    insert into public.uso_diario (despacho_id, fecha, asuntos_activos) values (d.id, v_hoy, n)
      on conflict (despacho_id, fecha) do update set asuntos_activos = greatest(public.uso_diario.asuntos_activos, excluded.asuntos_activos), registrado_en = now();
    select max(asuntos_activos) into v_max from public.uso_diario where despacho_id = d.id and fecha >= public.mes_actual();
    select asuntos_incluidos into v_incl from public.planes where id = d.plan_id;
    if v_incl > 0 and v_max >= ceil(v_incl * 0.8) then
      insert into public.avisos_uso (despacho_id, mes, umbral, asuntos_activos, incluidos) values (d.id, public.mes_actual(), 80, v_max, v_incl) on conflict do nothing;
    end if;
    if v_incl > 0 and v_max >= v_incl then
      insert into public.avisos_uso (despacho_id, mes, umbral, asuntos_activos, incluidos) values (d.id, public.mes_actual(), 100, v_max, v_incl) on conflict do nothing;
    end if;
    total := total + 1;
  end loop;
  return total;
end $$;

-- Importe de un mes con la misma fórmula que la calculadora de la web (web-referencia/v4.js):
-- base (mensual, o anual / 12) + asuntos por encima de los incluidos × exceso + extras contratados no incluidos en el plan.
create or replace function public.calcular_importe(p_plan text, p_facturacion text, p_asuntos int, p_extras text[] default '{}',
                                                  p_precios_pactados jsonb default '{}'::jsonb)
returns jsonb language plpgsql stable set search_path = '' as $$
declare p public.planes; v_base numeric; v_adic int; v_imp_adic numeric; v_extras numeric := 0; lineas jsonb := '[]'::jsonb; e record;
begin
  select * into p from public.planes where id = p_plan;
  if p.id is null then raise exception 'Plan desconocido'; end if;
  v_base := case when p_facturacion = 'anual' then p.precio_anio / 12 else p.precio_mes end;
  v_adic := greatest(0, coalesce(p_asuntos, 0) - p.asuntos_incluidos);
  v_imp_adic := v_adic * p.exceso_asunto;
  for e in select x.id, x.nombre, x.precio_mes, exists (select 1 from public.plan_extras pe where pe.plan_id = p.id and pe.extra_id = x.id) as incluido
             from public.extras x where x.id = any (coalesce(p_extras, '{}')) order by x.orden loop
    if not e.incluido then
      v_extras := v_extras + coalesce((p_precios_pactados ->> e.id)::numeric, e.precio_mes);
    end if;
    lineas := lineas || jsonb_build_object('extra', e.id, 'nombre', e.nombre, 'incluido', e.incluido,
      'importe', case when e.incluido then 0 else round(coalesce((p_precios_pactados ->> e.id)::numeric, e.precio_mes), 2) end);
  end loop;
  return jsonb_build_object(
    'plan', p.id, 'plan_nombre', p.nombre, 'facturacion', p_facturacion,
    'base', round(v_base, 2), 'precio_anio', p.precio_anio, 'precio_mes', p.precio_mes,
    'asuntos', coalesce(p_asuntos, 0), 'incluidos', p.asuntos_incluidos, 'adicionales', v_adic,
    'exceso', p.exceso_asunto, 'importe_adicional', round(v_imp_adic, 2),
    'extras', lineas, 'importe_extras', round(v_extras, 2),
    'total', round(v_base + v_imp_adic + v_extras, 2));
end $$;

-- Estimación del mes en curso de un despacho: asuntos activos = máximo registrado en el mes (o el recuento de ahora, si es mayor).
create or replace function public.estimacion_mes(p_despacho uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare d public.despachos; v_ahora int; v_max int; v_extras text[]; v_pactados jsonb; r jsonb;
begin
  if not (p_despacho = public.mi_despacho() or public.es_bufetea_admin() or public.llamada_interna()) then
    raise exception 'Sin acceso a este despacho';
  end if;
  select * into d from public.despachos where id = p_despacho;
  if d.id is null then raise exception 'Despacho no encontrado'; end if;
  v_ahora := public.asuntos_activos_de(d.id);
  select max(asuntos_activos) into v_max from public.uso_diario where despacho_id = d.id and fecha >= public.mes_actual();
  select coalesce(array_agg(extra_id), '{}'), coalesce(jsonb_object_agg(extra_id, precio_pactado) filter (where precio_pactado is not null), '{}'::jsonb)
    into v_extras, v_pactados from public.despacho_extras where despacho_id = d.id and activo;
  r := public.calcular_importe(d.plan_id, d.facturacion, greatest(coalesce(v_max, 0), v_ahora), v_extras, v_pactados);
  return r || jsonb_build_object('asuntos_activos_ahora', v_ahora, 'maximo_mes', greatest(coalesce(v_max, 0), v_ahora), 'mes', public.mes_actual());
end $$;

create or replace function public.mi_estimacion()
returns jsonb language sql stable security definer set search_path = '' as $$
  select public.estimacion_mes(public.mi_despacho())
$$;

create or replace function public.marcar_aviso_uso_visto(p_mes date, p_umbral int)
returns void language sql security definer set search_path = '' as $$
  update public.avisos_uso set visto_en = coalesce(visto_en, now())
   where despacho_id = public.mi_despacho() and mes = p_mes and umbral = p_umbral and public.mi_rol() = 'admin'
$$;

revoke execute on function public.registrar_uso() from public, anon, authenticated;
revoke execute on function public.asuntos_activos_de(uuid), public.estimacion_mes(uuid), public.mi_estimacion(),
  public.marcar_aviso_uso_visto(date, int) from public, anon;
grant execute on function public.asuntos_activos_de(uuid), public.estimacion_mes(uuid), public.mi_estimacion(),
  public.marcar_aviso_uso_visto(date, int) to authenticated;
-- La misma cuenta que la calculadora pública de la web: puede usarla cualquiera.
grant execute on function public.calcular_importe(text, text, int, text[], jsonb), public.mes_actual() to anon, authenticated;

-- Recuento diario (00:50 en Madrid en invierno, 01:50 en verano).
select cron.schedule('bufetea-uso-diario', '50 23 * * *', $$select public.registrar_uso()$$);
