-- Fase 2 · Migración 2 · Despachos (plan, facturación, estado, piloto, fundador, marca, art. 28), equipo y extras activos.
-- Solo añade: columnas nuevas con valor por defecto, tablas, funciones, disparadores y políticas.

-- ---------- Despachos ----------
alter table public.despachos
  add column if not exists plan_id text not null default 'starter' references public.planes(id),
  add column if not exists facturacion text not null default 'mensual' check (facturacion in ('mensual', 'anual')),
  add column if not exists estado text not null default 'piloto' check (estado in ('piloto', 'activo', 'cancelado')),
  add column if not exists piloto_fin date,
  add column if not exists precio_congelado_hasta date,
  add column if not exists slug text,
  add column if not exists marca jsonb not null default '{}'::jsonb,
  add column if not exists resena_google_url text,
  add column if not exists art28_aceptado_en timestamptz,
  add column if not exists art28_aceptado_por uuid references auth.users(id),
  add column if not exists art28_version text;
create unique index if not exists despachos_slug_unico on public.despachos (slug) where slug is not null;

-- Identificador corto del despacho: se usa en el buzón de entrada (<slug>@entrada.<dominio>) y en el portal.
create or replace function public.slug_despacho(p_nombre text)
returns text language plpgsql volatile set search_path = '' as $$
declare base text; s text; n int := 0;
begin
  base := lower(translate(replace(coalesce(p_nombre, ''), '&', ' y '),
                          'ÁÉÍÓÚÜÑÀÈÌÒÙÇáéíóúüñàèìòùç', 'AEIOUUNAEIOUCaeiouunaeiouc'));
  base := trim(both '-' from regexp_replace(base, '[^a-z0-9]+', '-', 'g'));
  base := left(coalesce(nullif(base, ''), 'despacho'), 40);
  s := base;
  while exists (select 1 from public.despachos where slug = s) loop
    n := n + 1; s := base || '-' || n;
  end loop;
  return s;
end $$;

create or replace function public.despachos_antes()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.slug is null then new.slug := public.slug_despacho(new.nombre); end if;
  -- Programa fundador: precio congelado 12 meses desde que se marca, salvo que se indique otra fecha.
  if new.fundador and new.precio_congelado_hasta is null
     and (tg_op = 'INSERT' or not old.fundador) then
    new.precio_congelado_hasta := (current_date + interval '12 months')::date;
  end if;
  return new;
end $$;
drop trigger if exists despachos_antes on public.despachos;
create trigger despachos_antes before insert or update on public.despachos
  for each row execute function public.despachos_antes();

update public.despachos set slug = public.slug_despacho(nombre) where slug is null;

-- ---------- Equipo ----------
alter table public.perfiles
  add column if not exists email text,
  add column if not exists activo boolean not null default true;
update public.perfiles p set email = u.email from auth.users u where u.id = p.id and p.email is null;

-- Personas de Bufetea con acceso al panel interno (se dan de alta a mano).
create table if not exists public.bufetea_admins (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  nombre text,
  creado_en timestamptz not null default now()
);
alter table public.bufetea_admins enable row level security;
create policy "me veo a mi mismo" on public.bufetea_admins for select to authenticated using (usuario_id = (select auth.uid()));

create or replace function public.es_bufetea_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.bufetea_admins where usuario_id = auth.uid())
$$;

create or replace function public.mi_rol()
returns text language sql stable security definer set search_path = '' as $$
  select rol from public.perfiles where id = auth.uid() and activo
$$;

-- Llamada de confianza: conexión directa a la base de datos (Edge Functions, cron), sin JWT de usuario.
create or replace function public.llamada_interna()
returns boolean language sql stable set search_path = '' as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''),
                  nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', 'interna')
         not in ('anon', 'authenticated')
$$;

create policy "bufetea ve los despachos" on public.despachos for select to authenticated using ((select public.es_bufetea_admin()));
create policy "bufetea ve los perfiles" on public.perfiles for select to authenticated using ((select public.es_bufetea_admin()));

-- ---------- Extras contratados, solicitudes y cambios de plan ----------
create table if not exists public.despacho_extras (
  despacho_id uuid not null references public.despachos(id) on delete cascade,
  extra_id text not null references public.extras(id),
  activo boolean not null default true,
  precio_pactado numeric(10,2) check (precio_pactado is null or precio_pactado >= 0),
  contratado_en timestamptz not null default now(),
  notas text,
  primary key (despacho_id, extra_id)
);
alter table public.despacho_extras enable row level security;
create policy "ver mis extras" on public.despacho_extras for select to authenticated
  using (despacho_id = (select public.mi_despacho()) or (select public.es_bufetea_admin()));

create table if not exists public.solicitudes_activacion (
  id bigint generated always as identity primary key,
  despacho_id uuid not null references public.despachos(id) on delete cascade,
  extra_id text not null references public.extras(id),
  solicitado_por uuid references auth.users(id),
  comentario text check (comentario is null or char_length(comentario) <= 1000),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'en_curso', 'activado', 'descartado')),
  creada timestamptz not null default now(),
  actualizada timestamptz not null default now()
);
create unique index if not exists solicitudes_activacion_una_abierta
  on public.solicitudes_activacion (despacho_id, extra_id) where estado in ('pendiente', 'en_curso');
alter table public.solicitudes_activacion enable row level security;
create policy "ver mis solicitudes" on public.solicitudes_activacion for select to authenticated
  using (despacho_id = (select public.mi_despacho()) or (select public.es_bufetea_admin()));

create table if not exists public.cambios_plan (
  id bigint generated always as identity primary key,
  despacho_id uuid not null references public.despachos(id) on delete cascade,
  plan_anterior text, plan_nuevo text not null,
  facturacion_anterior text, facturacion_nueva text not null,
  cambiado_por uuid references auth.users(id),
  creado_en timestamptz not null default now()
);
alter table public.cambios_plan enable row level security;
create policy "ver mis cambios de plan" on public.cambios_plan for select to authenticated
  using (despacho_id = (select public.mi_despacho()) or (select public.es_bufetea_admin()));

-- ---------- ¿Está activo un extra? (fuente única de los bloqueos) ----------
-- Un extra está activo si viene incluido en el plan del despacho o si lo tiene contratado. Un despacho cancelado no tiene extras.
-- Desde la app solo responde por el propio despacho; las llamadas internas y el panel de Bufetea pueden preguntar por cualquiera.
create or replace function public.extra_activo(p_despacho uuid, p_extra text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.despachos d
     where d.id = p_despacho and d.estado <> 'cancelado'
       and (p_despacho = public.mi_despacho() or public.es_bufetea_admin() or public.llamada_interna())
       and (exists (select 1 from public.plan_extras pe where pe.plan_id = d.plan_id and pe.extra_id = p_extra)
            or exists (select 1 from public.despacho_extras de where de.despacho_id = d.id and de.extra_id = p_extra and de.activo)))
$$;

-- Para usar en Edge Functions y RPC: corta con un error claro si el extra no está activo.
create or replace function public.exigir_extra(p_despacho uuid, p_extra text)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.extra_activo(p_despacho, p_extra) then
    raise exception 'EXTRA_NO_ACTIVO: % no está incluido en el plan de este despacho ni contratado.', p_extra
      using errcode = 'P0001', hint = 'Solicita la activación desde «Tu plan».';
  end if;
end $$;

create or replace function public.mis_extras()
returns table (extra_id text, nombre text, subtitulo text, precio_mes numeric, desde boolean, caracteristicas jsonb, nota text,
               activo boolean, origen text, precio_pactado numeric, solicitud_abierta boolean)
language sql stable security definer set search_path = '' as $$
  select e.id, e.nombre, e.subtitulo, e.precio_mes, e.desde, e.caracteristicas, e.nota,
         d.estado <> 'cancelado' and (pe.extra_id is not null or coalesce(de.activo, false)),
         case when d.estado = 'cancelado' then null when pe.extra_id is not null then 'incluido' when de.activo then 'contratado' end,
         de.precio_pactado,
         exists (select 1 from public.solicitudes_activacion s where s.despacho_id = d.id and s.extra_id = e.id and s.estado in ('pendiente', 'en_curso'))
    from public.extras e
    join public.despachos d on d.id = public.mi_despacho()
    left join public.plan_extras pe on pe.plan_id = d.plan_id and pe.extra_id = e.id
    left join public.despacho_extras de on de.despacho_id = d.id and de.extra_id = e.id
   order by e.orden
$$;

-- ---------- RPC de la app ----------
-- Alta de un despacho nuevo: exige aceptar el contrato de encargo del tratamiento (art. 28 RGPD).
create or replace function public.alta_despacho(p_nombre text, p_mi_nombre text, p_acepta_art28 boolean, p_version text default 'v1')
returns uuid language plpgsql security definer set search_path = '' as $$
declare v uuid; v_email text;
begin
  if auth.uid() is null then raise exception 'Hay que iniciar sesión'; end if;
  if coalesce(p_acepta_art28, false) is false then raise exception 'Para dar de alta el despacho hay que aceptar el contrato de encargo del tratamiento.'; end if;
  if char_length(trim(coalesce(p_nombre, ''))) < 2 then raise exception 'Escribe el nombre del despacho.'; end if;
  select despacho_id into v from public.perfiles where id = auth.uid();
  if v is not null then return v; end if;
  select email into v_email from auth.users where id = auth.uid();
  insert into public.despachos (nombre, art28_aceptado_en, art28_aceptado_por, art28_version)
    values (trim(p_nombre), now(), auth.uid(), left(coalesce(p_version, 'v1'), 20)) returning id into v;
  insert into public.perfiles (id, despacho_id, nombre, rol, email) values (auth.uid(), v, nullif(trim(p_mi_nombre), ''), 'admin', v_email);
  return v;
end $$;

-- Para despachos que ya existían antes de este requisito.
create or replace function public.aceptar_art28(p_version text default 'v1')
returns void language plpgsql security definer set search_path = '' as $$
begin
  if public.mi_rol() is distinct from 'admin' then raise exception 'Solo la persona titular del despacho puede aceptar el contrato.'; end if;
  update public.despachos set art28_aceptado_en = now(), art28_aceptado_por = auth.uid(), art28_version = left(coalesce(p_version, 'v1'), 20)
   where id = public.mi_despacho();
end $$;

-- Cambio de plan: los extras incluidos se activan o se bloquean solos (se calculan, no se copian);
-- lo contratado aparte se conserva en despacho_extras.
create or replace function public.cambiar_plan(p_plan text, p_facturacion text)
returns void language plpgsql security definer set search_path = '' as $$
declare d public.despachos;
begin
  if public.mi_rol() is distinct from 'admin' then raise exception 'Solo la persona titular del despacho puede cambiar el plan.'; end if;
  if not exists (select 1 from public.planes where id = p_plan) then raise exception 'Plan desconocido'; end if;
  if p_facturacion not in ('mensual', 'anual') then raise exception 'Forma de pago desconocida'; end if;
  select * into d from public.despachos where id = public.mi_despacho() for update;
  if d.estado = 'cancelado' then raise exception 'El despacho está dado de baja.'; end if;
  if d.plan_id = p_plan and d.facturacion = p_facturacion then return; end if;
  update public.despachos set plan_id = p_plan, facturacion = p_facturacion where id = d.id;
  insert into public.cambios_plan (despacho_id, plan_anterior, plan_nuevo, facturacion_anterior, facturacion_nueva, cambiado_por)
    values (d.id, d.plan_id, p_plan, d.facturacion, p_facturacion, auth.uid());
end $$;

create or replace function public.solicitar_activacion(p_extra text, p_comentario text default null)
returns bigint language plpgsql security definer set search_path = '' as $$
declare v_desp uuid := public.mi_despacho(); v bigint;
begin
  if v_desp is null then raise exception 'Primero crea tu despacho.'; end if;
  if not exists (select 1 from public.extras where id = p_extra) then raise exception 'Extra desconocido'; end if;
  if public.extra_activo(v_desp, p_extra) then raise exception 'Este extra ya está activo en tu despacho.'; end if;
  select id into v from public.solicitudes_activacion
   where despacho_id = v_desp and extra_id = p_extra and estado in ('pendiente', 'en_curso');
  if v is not null then return v; end if;
  insert into public.solicitudes_activacion (despacho_id, extra_id, solicitado_por, comentario)
    values (v_desp, p_extra, auth.uid(), nullif(left(trim(coalesce(p_comentario, '')), 1000), '')) returning id into v;
  return v;
end $$;

create or replace function public.cambiar_rol(p_usuario uuid, p_rol text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_desp uuid := public.mi_despacho();
begin
  if public.mi_rol() is distinct from 'admin' then raise exception 'Solo la persona titular puede cambiar los roles.'; end if;
  if p_rol not in ('admin', 'abogado', 'administrativo') then raise exception 'Rol desconocido'; end if;
  if not exists (select 1 from public.perfiles where id = p_usuario and despacho_id = v_desp) then raise exception 'Usuario no encontrado'; end if;
  if p_rol <> 'admin' and not exists (select 1 from public.perfiles where despacho_id = v_desp and rol = 'admin' and activo and id <> p_usuario) then
    raise exception 'El despacho tiene que tener al menos una persona titular.';
  end if;
  update public.perfiles set rol = p_rol where id = p_usuario and despacho_id = v_desp;
end $$;

-- Permisos: las funciones internas no se exponen a visitantes anónimos.
revoke execute on function public.slug_despacho(text) from public, anon, authenticated;
revoke execute on function public.despachos_antes() from public, anon, authenticated;
revoke execute on function public.alta_despacho(text, text, boolean, text) from public, anon;
revoke execute on function public.aceptar_art28(text) from public, anon;
revoke execute on function public.cambiar_plan(text, text) from public, anon;
revoke execute on function public.solicitar_activacion(text, text) from public, anon;
revoke execute on function public.cambiar_rol(uuid, text) from public, anon;
revoke execute on function public.mis_extras() from public, anon;
revoke execute on function public.exigir_extra(uuid, text) from public, anon;
revoke execute on function public.extra_activo(uuid, text) from public, anon;
revoke execute on function public.mi_rol() from public, anon;
grant execute on function public.alta_despacho(text, text, boolean, text), public.aceptar_art28(text), public.cambiar_plan(text, text),
  public.solicitar_activacion(text, text), public.cambiar_rol(uuid, text), public.mis_extras(), public.exigir_extra(uuid, text),
  public.extra_activo(uuid, text), public.mi_rol(), public.es_bufetea_admin(), public.llamada_interna() to authenticated;
