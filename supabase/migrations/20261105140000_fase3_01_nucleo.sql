-- Fase 3 · Migración 1 · Núcleo: notificaciones explicadas, mensajes por WhatsApp y en el idioma del cliente,
-- reglas (automático / con revisión / límites), WhatsApp del despacho, «¿cómo va lo mío?» con código, índice y sello.
-- Añade tablas, columnas y funciones. Amplía (sin quitar valores) los checks de mensajes.canal, mensajes.tipo y
-- despachos.envio_auto, y sustituye ajustar_envio_auto y proponer_recordatorios por versiones compatibles.

-- ---------- Notificaciones (PDF de LexNET) ----------
create table if not exists public.notificaciones (
  id uuid primary key default gen_random_uuid(),
  despacho_id uuid not null references public.despachos(id) on delete cascade,
  asunto_id uuid references public.asuntos(id) on delete set null,
  origen text not null default 'subida' check (origen in ('buzon', 'subida', 'conector')),
  remitente text, asunto_correo text,
  archivo_path text, archivo_nombre text, archivo_hash text,
  texto text,
  estado text not null default 'recibida' check (estado in ('recibida', 'interpretando', 'lista', 'enviada', 'no_contar', 'revisada', 'error')),
  error text,
  tipo_resolucion text, organo text, procedimiento text, fecha_resolucion date,
  lo_que_dice text, resumen text,
  plazo_tipo text, plazo_descripcion text, plazo_dias int, plazo_fecha date,
  senalamiento_en timestamptz, senalamiento_lugar text,
  cliente_debe_actuar boolean, accion_cliente text, fase_sugerida text,
  ia text,
  creada_en timestamptz not null default now(),
  procesada_en timestamptz,
  revisada_por uuid references auth.users(id), revisada_en timestamptz
);
create unique index if not exists notificaciones_hash on public.notificaciones (despacho_id, archivo_hash) where archivo_hash is not null;
create index if not exists notificaciones_despacho_estado on public.notificaciones (despacho_id, estado, creada_en desc);
alter table public.notificaciones enable row level security;
create policy "ver mis notificaciones" on public.notificaciones for select to authenticated
  using (despacho_id = (select public.mi_despacho()));

-- ---------- Mensajes: WhatsApp, idioma, trazabilidad ----------
alter table public.mensajes drop constraint if exists mensajes_canal_check;
alter table public.mensajes add constraint mensajes_canal_check check (canal in ('email', 'whatsapp'));
alter table public.mensajes drop constraint if exists mensajes_tipo_check;
alter table public.mensajes add constraint mensajes_tipo_check check (tipo in (
  'manual', 'novedad', 'recordatorio_semana', 'recordatorio_vispera', 'cierre', 'cobro', 'sin_noticias', 'respuesta_codigo'));
alter table public.mensajes
  add column if not exists notificacion_id uuid references public.notificaciones(id) on delete set null,
  add column if not exists idioma text not null default 'es' check (idioma ~ '^[a-z]{2,3}$'),
  add column if not exists cuerpo_es text,
  add column if not exists regla_auto text,
  add column if not exists entregado_en timestamptz,
  add column if not exists leido_en timestamptz;
create index if not exists mensajes_notificacion on public.mensajes (notificacion_id) where notificacion_id is not null;

alter table public.despachos drop constraint if exists despachos_envio_auto_check;
alter table public.despachos add constraint despachos_envio_auto_check check (envio_auto <@ array[
  'recordatorio_semana', 'recordatorio_vispera', 'respuesta_codigo', 'consultas_nuevas', 'avisos_sin_noticias', 'cierre']::text[]);

-- Límites del abogado, en la base de datos: nada sale sin aprobación de un abogado o sin una regla automática activa.
-- Las explicaciones de notificaciones (tipo «novedad») nunca salen solas.
create or replace function public.mensajes_control()
returns trigger language plpgsql set search_path = '' as $$
declare v_auto text[]; v_rol text;
begin
  if new.auto and new.regla_auto is null then new.regla_auto := new.tipo; end if;
  if new.estado in ('programado', 'enviando', 'enviado')
     and (tg_op = 'INSERT' or old.estado not in ('programado', 'enviando', 'enviado')) then
    if new.auto then
      select envio_auto into v_auto from public.despachos where id = new.despacho_id;
      if new.tipo = 'novedad' then
        raise exception 'LIMITE: las explicaciones de notificaciones no salen sin la aprobación de un abogado.';
      end if;
      if not (new.regla_auto = any (coalesce(v_auto, '{}'))) then
        raise exception 'LIMITE: no hay ninguna regla automática activa que permita enviar este mensaje (%).', new.regla_auto;
      end if;
    else
      if new.aprobado_por is null then
        raise exception 'LIMITE: este mensaje necesita la aprobación de un abogado.';
      end if;
      select rol into v_rol from public.perfiles where id = new.aprobado_por and despacho_id = new.despacho_id and activo;
      if v_rol is null or v_rol = 'administrativo' then
        raise exception 'LIMITE: lo aprueba un abogado del despacho.';
      end if;
      new.aprobado_en := coalesce(new.aprobado_en, now());
    end if;
  end if;
  return new;
end $$;
drop trigger if exists mensajes_control on public.mensajes;
create trigger mensajes_control before insert or update on public.mensajes for each row execute function public.mensajes_control();

-- ---------- WhatsApp del despacho ----------
create table if not exists public.wa_numeros (
  phone_number_id text primary key,
  despacho_id uuid not null references public.despachos(id) on delete cascade,
  numero text not null,
  waba_id text,
  modo text not null default 'pruebas' check (modo in ('pruebas', 'produccion')),
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);
create unique index if not exists wa_numeros_un_activo on public.wa_numeros (despacho_id) where activo;
alter table public.wa_numeros enable row level security;
create policy "ver mi numero de whatsapp" on public.wa_numeros for select to authenticated
  using (despacho_id = (select public.mi_despacho()) or (select public.es_bufetea_admin()));

create table if not exists public.wa_conversaciones (
  id uuid primary key default gen_random_uuid(),
  despacho_id uuid not null references public.despachos(id) on delete cascade,
  telefono text not null check (telefono ~ '^\d{8,15}$'),
  nombre_perfil text,
  cliente_id uuid references public.clientes(id) on delete set null,
  ultimo_entrante_en timestamptz,
  ultimo_mensaje_en timestamptz not null default now(),
  no_leidos int not null default 0,
  verificada_hasta timestamptz,
  verificado_cliente_id uuid references public.clientes(id) on delete set null,
  propuesta text, propuesta_motivo text, propuesta_en timestamptz,
  creado_en timestamptz not null default now(),
  unique (despacho_id, telefono)
);
create index if not exists wa_conversaciones_reciente on public.wa_conversaciones (despacho_id, ultimo_mensaje_en desc);
alter table public.wa_conversaciones enable row level security;
create policy "ver mis conversaciones" on public.wa_conversaciones for select to authenticated
  using (despacho_id = (select public.mi_despacho()));

create table if not exists public.wa_mensajes (
  id uuid primary key default gen_random_uuid(),
  despacho_id uuid not null references public.despachos(id) on delete cascade,
  conversacion_id uuid not null references public.wa_conversaciones(id) on delete cascade,
  direccion text not null check (direccion in ('entrada', 'salida')),
  tipo text not null default 'texto' check (tipo in ('texto', 'audio', 'imagen', 'documento', 'plantilla', 'otro')),
  texto text, media_path text, media_mime text, transcripcion text,
  wa_id text unique,
  estado text not null default 'recibido' check (estado in ('recibido', 'enviando', 'enviado', 'entregado', 'leido', 'fallido')),
  error text,
  enviado_por uuid references auth.users(id),
  auto boolean not null default false,
  regla_auto text,
  mensaje_id uuid references public.mensajes(id) on delete set null,
  asunto_id uuid references public.asuntos(id) on delete set null,
  creado_en timestamptz not null default now()
);
create index if not exists wa_mensajes_conversacion on public.wa_mensajes (conversacion_id, creado_en);
alter table public.wa_mensajes enable row level security;
create policy "ver mis mensajes de whatsapp" on public.wa_mensajes for select to authenticated
  using (despacho_id = (select public.mi_despacho()));

create or replace function public.marcar_conversacion_leida(p_conversacion uuid)
returns void language sql security definer set search_path = '' as $$
  update public.wa_conversaciones set no_leidos = 0 where id = p_conversacion and despacho_id = public.mi_despacho()
$$;

-- ---------- Identidad del cliente: número + código ----------
-- Devuelve el cliente solo si el número de teléfono es el de su ficha Y el código es el suyo. Con 3 fallos por número
-- en 1 hora o 20 en el despacho en 10 minutos, bloquea. Uso interno (funciones del servidor).
create or replace function public.verificar_cliente(p_despacho uuid, p_telefono text, p_codigo text, p_canal text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_tel text := right(regexp_replace(coalesce(p_telefono, ''), '\D', '', 'g'), 9);
  v_cod text := regexp_replace(coalesce(p_codigo, ''), '\D', '', 'g'); v_cli uuid; f_num int; f_desp int;
begin
  if not public.llamada_interna() then raise exception 'Solo para uso interno'; end if;
  if length(v_tel) < 9 or length(v_cod) <> 6 then return null; end if;
  select count(*) filter (where not ok and conversacion_id = p_canal || ':' || v_tel and creado_en > now() - interval '1 hour'),
         count(*) filter (where not ok and creado_en > now() - interval '10 minutes')
    into f_num, f_desp from privado.intentos_codigo where despacho_id = p_despacho and creado_en > now() - interval '1 hour';
  if f_num >= 3 or f_desp >= 20 then return null; end if;
  select id into v_cli from public.clientes
   where despacho_id = p_despacho and not eliminado and codigo = v_cod
     and right(regexp_replace(coalesce(telefono, ''), '\D', '', 'g'), 9) = v_tel
   limit 1;
  insert into privado.intentos_codigo (despacho_id, conversacion_id, ok) values (p_despacho, p_canal || ':' || v_tel, v_cli is not null);
  return v_cli;
end $$;

-- Lo único que se puede contar a un cliente verificado: la fase y la última novedad aprobada y enviada de sus asuntos
-- que el despacho informa. Nunca notas internas ni borradores.
create or replace function public.estado_aprobado_cliente(p_cliente uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when not public.llamada_interna() then null else coalesce(jsonb_agg(x order by x ->> 'apertura' desc), '[]'::jsonb) end
  from (
    select jsonb_build_object(
      'asunto', coalesce(a.descripcion, a.numero, 'su asunto'),
      'fase', a.fase_cliente,
      'apertura', a.fecha_apertura,
      'ultima_novedad', (select coalesce(m.cuerpo_es, m.cuerpo) from public.mensajes m where m.asunto_id = a.id and m.estado = 'enviado' order by m.enviado_en desc limit 1),
      'ultima_novedad_idioma', (select m.cuerpo from public.mensajes m where m.asunto_id = a.id and m.estado = 'enviado' order by m.enviado_en desc limit 1),
      'fecha', (select to_char(max(m.enviado_en) at time zone 'Europe/Madrid', 'DD/MM/YYYY') from public.mensajes m where m.asunto_id = a.id and m.estado = 'enviado')
    ) as x
    from public.asuntos a
    join public.asunto_clientes ac on ac.asunto_id = a.id and ac.cliente_id = p_cliente
    where not a.eliminado and a.situacion = 'abierto' and a.informar
  ) s
$$;
revoke execute on function public.verificar_cliente(uuid, text, text, text), public.estado_aprobado_cliente(uuid) from public, anon, authenticated;

-- ---------- Reglas ----------
create or replace function public.ajustar_envio_auto(p_tipos text[])
returns text[] language plpgsql security definer set search_path = '' as $$
declare v_desp uuid := public.mi_despacho(); v text[];
begin
  if public.mi_rol() is distinct from 'admin' then raise exception 'Solo la persona titular del despacho cambia las reglas.'; end if;
  select coalesce(array_agg(distinct t), '{}') into v from unnest(coalesce(p_tipos, '{}')) t
   where t in ('recordatorio_semana', 'recordatorio_vispera', 'respuesta_codigo', 'consultas_nuevas', 'avisos_sin_noticias', 'cierre');
  update public.despachos set envio_auto = v where id = v_desp;
  -- Lo que estaba programado por una regla que se apaga vuelve a esperar aprobación.
  update public.mensajes set estado = 'borrador', aprobado_en = null, aprobado_por = null, auto = false, regla_auto = null, actualizado_en = now()
   where despacho_id = v_desp and auto and estado = 'programado' and not (coalesce(regla_auto, tipo) = any (v));
  -- Lo pendiente de una regla que se enciende pasa a salir solo.
  update public.mensajes set estado = 'programado', aprobado_en = now(), aprobado_por = null, auto = true, regla_auto = tipo, error = null, actualizado_en = now()
   where despacho_id = v_desp and estado = 'borrador' and tipo = any (v) and tipo <> 'novedad' and programado_para > now();
  return v;
end $$;

-- Recordatorios de cita: ahora también por WhatsApp, según el canal de la ficha del cliente, y en su idioma.
create or replace function public.proponer_recordatorios(p_despacho uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare n int := 0; k int; f record; firma text; v_auto text[]; a_sem boolean; a_vis boolean; v_canal text; v_dest text;
begin
  select coalesce(d.firma, d.nombre), d.envio_auto into firma, v_auto from public.despachos d where d.id = p_despacho;
  a_sem := 'recordatorio_semana' = any (coalesce(v_auto, '{}'));
  a_vis := 'recordatorio_vispera' = any (coalesce(v_auto, '{}'));
  update public.mensajes m set estado = 'cancelado', actualizado_en = now(), error = 'La cita ha cambiado o ya no existe'
    from public.agenda e
   where m.agenda_id = e.id and m.despacho_id = p_despacho and m.estado in ('borrador', 'programado')
     and (e.eliminado
          or (m.tipo = 'recordatorio_semana' and m.programado_para is distinct from e.inicio - interval '7 days')
          or (m.tipo = 'recordatorio_vispera' and m.programado_para is distinct from public.vispera_10h(e.inicio)));
  for f in
    select e.id as agenda_id, e.titulo, e.inicio, e.lugar, e.todo_el_dia, a.id as asunto_id, a.descripcion,
           c.id as cliente_id, c.nombre, c.email, c.telefono, c.canal, c.idioma
      from public.agenda e
      join public.asuntos a on a.id = e.asunto_id and a.informar and not a.eliminado and a.situacion = 'abierto'
      join public.clientes c on c.id = a.cliente_id and not c.eliminado and (c.email is not null or c.telefono is not null)
     where e.despacho_id = p_despacho and not e.eliminado and e.inicio > now() + interval '1 day' and e.inicio < now() + interval '45 days'
  loop
    v_canal := case when f.canal = 'whatsapp' and f.telefono is not null then 'whatsapp' when f.email is not null then 'email' else 'whatsapp' end;
    v_dest := case when v_canal = 'whatsapp' then f.telefono else f.email end;
    if f.inicio - interval '7 days' > now() then
      insert into public.mensajes (despacho_id, asunto_id, cliente_id, agenda_id, tipo, canal, idioma, destinatario, titulo, cuerpo, estado, programado_para, aprobado_en, auto, regla_auto)
      values (p_despacho, f.asunto_id, f.cliente_id, f.agenda_id, 'recordatorio_semana', v_canal, f.idioma, v_dest,
        'Recordatorio: ' || coalesce(f.titulo, 'cita') || ' el ' || to_char(f.inicio at time zone 'Europe/Madrid', 'DD/MM/YYYY'),
        'Hola, ' || split_part(f.nombre, ' ', 1) || '.' || E'\n\n' ||
        'Le recordamos que el ' || to_char(f.inicio at time zone 'Europe/Madrid', 'DD/MM/YYYY') ||
        case when f.todo_el_dia then '' else ' a las ' || to_char(f.inicio at time zone 'Europe/Madrid', 'HH24:MI') end ||
        ' tiene «' || coalesce(f.titulo, 'una cita') || '»' || coalesce(' en ' || f.lugar, '') || ', de su asunto «' || coalesce(f.descripcion, '') || '».' || E'\n\n' ||
        'Si tiene cualquier duda, responda a este mensaje y le contestaremos.' || E'\n\n' || 'Un saludo,' || E'\n' || firma,
        case when a_sem then 'programado' else 'borrador' end, f.inicio - interval '7 days', case when a_sem then now() end, a_sem,
        case when a_sem then 'recordatorio_semana' end)
      on conflict do nothing;
      get diagnostics k = row_count; n := n + k;
    end if;
    if public.vispera_10h(f.inicio) > now() then
      insert into public.mensajes (despacho_id, asunto_id, cliente_id, agenda_id, tipo, canal, idioma, destinatario, titulo, cuerpo, estado, programado_para, aprobado_en, auto, regla_auto)
      values (p_despacho, f.asunto_id, f.cliente_id, f.agenda_id, 'recordatorio_vispera', v_canal, f.idioma, v_dest,
        'Mañana: ' || coalesce(f.titulo, 'cita'),
        'Hola, ' || split_part(f.nombre, ' ', 1) || '.' || E'\n\n' ||
        'Le recordamos que mañana' ||
        case when f.todo_el_dia then '' else ', a las ' || to_char(f.inicio at time zone 'Europe/Madrid', 'HH24:MI') || ',' end ||
        ' tiene «' || coalesce(f.titulo, 'una cita') || '»' || coalesce(' en ' || f.lugar, '') || '. Traiga su DNI y la documentación que le hayamos indicado.' || E'\n\n' ||
        'Un saludo,' || E'\n' || firma,
        case when a_vis then 'programado' else 'borrador' end, public.vispera_10h(f.inicio), case when a_vis then now() end, a_vis,
        case when a_vis then 'recordatorio_vispera' end)
      on conflict do nothing;
      get diagnostics k = row_count; n := n + k;
    end if;
  end loop;
  return n;
end $$;

-- ---------- Notificaciones: acciones del equipo ----------
create or replace function public.asignar_notificacion(p_notificacion uuid, p_asunto uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_desp uuid := public.mi_despacho();
begin
  if not exists (select 1 from public.notificaciones where id = p_notificacion and despacho_id = v_desp) then raise exception 'Notificación no encontrada'; end if;
  if p_asunto is not null and not exists (select 1 from public.asuntos where id = p_asunto and despacho_id = v_desp) then raise exception 'Asunto no encontrado'; end if;
  update public.notificaciones set asunto_id = p_asunto where id = p_notificacion;
end $$;

-- «No contárselo» / «Marcar como revisada»: la notificación queda revisada y su borrador, cancelado.
create or replace function public.no_contar_notificacion(p_notificacion uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_desp uuid := public.mi_despacho();
begin
  if public.mi_rol() is null then raise exception 'Sin acceso'; end if;
  update public.notificaciones set estado = 'no_contar', revisada_por = auth.uid(), revisada_en = now()
   where id = p_notificacion and despacho_id = v_desp and estado in ('lista', 'error', 'recibida');
  if not found then raise exception 'Esta notificación ya se ha resuelto.'; end if;
  update public.mensajes set estado = 'cancelado', actualizado_en = now()
   where notificacion_id = p_notificacion and despacho_id = v_desp and estado in ('borrador', 'error');
end $$;

-- ---------- Clientes sin noticias, índice y sello ----------
create or replace function public.asuntos_sin_noticias(p_dias int default 30)
returns table (asunto_id uuid, numero text, descripcion text, cliente_id uuid, cliente text, ultima_noticia timestamptz, dias int)
language sql stable security definer set search_path = '' as $$
  select a.id, a.numero, a.descripcion, c.id, c.nombre, u.ultima,
         floor(extract(epoch from (now() - coalesce(u.ultima, a.fecha_apertura::timestamptz, a.creado_en))) / 86400)::int
    from public.asuntos a
    join public.clientes c on c.id = a.cliente_id and not c.eliminado
    left join lateral (select max(m.enviado_en) as ultima from public.mensajes m where m.asunto_id = a.id and m.estado = 'enviado') u on true
   where a.despacho_id = public.mi_despacho() and not a.eliminado and a.situacion = 'abierto' and a.informar and a.duplicado_de is null
     and coalesce(u.ultima, a.fecha_apertura::timestamptz, a.creado_en) < now() - make_interval(days => p_dias)
   order by 7 desc
$$;

-- Índice de cliente informado: % de clientes con algún asunto activo informado que han recibido noticias en los últimos 30 días.
-- Con menos de 5 asuntos informables o sin ningún mensaje enviado no hay datos suficientes (porcentaje nulo).
create or replace function public.indice_informado(p_despacho uuid, p_fecha date default current_date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_asuntos int; v_clientes int; v_inf int; v_env int; v_pct int;
begin
  if not (p_despacho = public.mi_despacho() or public.es_bufetea_admin() or public.llamada_interna()) then raise exception 'Sin acceso'; end if;
  select count(*), count(distinct a.cliente_id) into v_asuntos, v_clientes from public.asuntos a
    join public.clientes c on c.id = a.cliente_id and not c.eliminado
   where a.despacho_id = p_despacho and not a.eliminado and a.situacion = 'abierto' and a.informar and a.duplicado_de is null;
  select count(distinct a.cliente_id) into v_inf from public.asuntos a
    join public.clientes c on c.id = a.cliente_id and not c.eliminado
   where a.despacho_id = p_despacho and not a.eliminado and a.situacion = 'abierto' and a.informar and a.duplicado_de is null
     and exists (select 1 from public.mensajes m where m.estado = 'enviado' and (m.asunto_id = a.id or m.cliente_id = a.cliente_id)
                  and m.enviado_en > (p_fecha + 1)::timestamptz - interval '30 days' and m.enviado_en < (p_fecha + 1)::timestamptz);
  select count(*) into v_env from public.mensajes where despacho_id = p_despacho and estado = 'enviado';
  v_pct := case when v_asuntos < 5 or v_env = 0 or v_clientes = 0 then null else round(100.0 * v_inf / v_clientes) end;
  return jsonb_build_object('porcentaje', v_pct, 'clientes', v_clientes, 'informados', v_inf, 'asuntos', v_asuntos,
                            'sello', coalesce(v_pct >= 85, false), 'sin_datos', v_pct is null);
end $$;

create table if not exists public.indice_mensual (
  despacho_id uuid not null references public.despachos(id) on delete cascade,
  mes date not null,
  porcentaje int, clientes int, informados int, sello boolean not null default false,
  calculado_en timestamptz not null default now(),
  primary key (despacho_id, mes)
);
alter table public.indice_mensual enable row level security;
create policy "ver mi indice" on public.indice_mensual for select to authenticated
  using (despacho_id = (select public.mi_despacho()) or (select public.es_bufetea_admin()));

-- Guarda el índice del mes que acaba (el día 1 a primera hora).
create or replace function public.guardar_indice_mensual()
returns int language plpgsql security definer set search_path = '' as $$
declare d record; r jsonb; v_mes date := (date_trunc('month', now() at time zone 'Europe/Madrid') - interval '1 month')::date; n int := 0;
begin
  for d in select id from public.despachos where estado <> 'cancelado' loop
    r := public.indice_informado(d.id, (v_mes + interval '1 month' - interval '1 day')::date);
    insert into public.indice_mensual (despacho_id, mes, porcentaje, clientes, informados, sello)
      values (d.id, v_mes, (r ->> 'porcentaje')::int, (r ->> 'clientes')::int, (r ->> 'informados')::int, (r ->> 'sello')::boolean)
      on conflict (despacho_id, mes) do update set porcentaje = excluded.porcentaje, clientes = excluded.clientes,
        informados = excluded.informados, sello = excluded.sello, calculado_en = now();
    n := n + 1;
  end loop;
  return n;
end $$;

-- Indicadores del índice: tiempo medio de la notificación al cliente y «¿cómo va lo mío?» respondidas este mes.
create or replace function public.indicadores_mes()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'minutos_medios_notificacion', (select round(avg(extract(epoch from (m.enviado_en - n.creada_en)) / 60))
       from public.mensajes m join public.notificaciones n on n.id = m.notificacion_id
      where m.despacho_id = public.mi_despacho() and m.estado = 'enviado' and m.enviado_en >= public.mes_actual()),
    'como_va_lo_mio', (select count(*) from public.wa_mensajes w where w.despacho_id = public.mi_despacho()
      and w.direccion = 'salida' and w.regla_auto = 'respuesta_codigo' and w.creado_en >= public.mes_actual())
      + (select count(*) from public.llamadas l where l.despacho_id = public.mi_despacho() and l.verificado and l.creado_en >= public.mes_actual()),
    'asuntos_excluidos', (select count(*) from public.asuntos a where a.despacho_id = public.mi_despacho()
      and not a.eliminado and a.situacion = 'abierto' and not a.informar)
  )
$$;

-- Agenda: también admite señalamientos detectados en notificaciones (sin id del programa de gestión).
drop trigger if exists agenda_internos on public.agenda;
create trigger agenda_internos before insert on public.agenda for each row execute function public.filas_internas_antes();

-- ---------- Almacenamiento privado (PDF y adjuntos de WhatsApp), carpeta por despacho ----------
insert into storage.buckets (id, name, public, file_size_limit)
  values ('notificaciones', 'notificaciones', false, 20971520), ('whatsapp', 'whatsapp', false, 20971520)
  on conflict (id) do nothing;
create policy "leer archivos de mi despacho" on storage.objects for select to authenticated
  using (bucket_id in ('notificaciones', 'whatsapp') and (storage.foldername(name))[1] = (select public.mi_despacho())::text);

-- ---------- Permisos ----------
revoke execute on function public.mensajes_control(), public.guardar_indice_mensual() from public, anon, authenticated;
revoke execute on function public.marcar_conversacion_leida(uuid), public.asignar_notificacion(uuid, uuid), public.no_contar_notificacion(uuid),
  public.asuntos_sin_noticias(int), public.indice_informado(uuid, date), public.indicadores_mes(), public.ajustar_envio_auto(text[]),
  public.proponer_recordatorios(uuid) from public, anon;
grant execute on function public.marcar_conversacion_leida(uuid), public.asignar_notificacion(uuid, uuid), public.no_contar_notificacion(uuid),
  public.asuntos_sin_noticias(int), public.indice_informado(uuid, date), public.indicadores_mes(), public.ajustar_envio_auto(text[]) to authenticated;
revoke execute on function public.proponer_recordatorios(uuid) from authenticated;

select cron.schedule('bufetea-indice-mensual', '40 0 1 * *', $$select public.guardar_indice_mensual()$$);
