-- Fase 2 · Migración 6 (aprobada por Tico el 05/11/2026)
-- 1. Códigos de verificación de 6 cifras, generados con aleatoriedad criptográfica; se regenera el del cliente actual.
-- 2. RLS activada en las tablas de «privado» (sin políticas: solo las usan las funciones del servidor como propietarias).
-- 3. En modo integrado, los datos que vienen del programa de gestión son de solo lectura desde la app.
-- 4. Solicitudes para comprobar si el programa de gestión de un despacho se puede conectar.

create or replace function public.asignar_codigo_cliente()
returns trigger language plpgsql set search_path = '' as $$
declare c text; intentos int := 0;
begin
  if new.codigo is not null and new.codigo ~ '^\d{6}$' then return new; end if;
  loop
    c := lpad(((('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint) % 1000000)::text, 6, '0');
    exit when not exists (select 1 from public.clientes where despacho_id = new.despacho_id and codigo = c);
    intentos := intentos + 1;
    if intentos > 100 then raise exception 'No se ha podido generar un código único'; end if;
  end loop;
  new.codigo := c;
  return new;
end $$;

-- Regenera los códigos que no tienen 6 cifras (hoy, un cliente). Se hace como llamada interna.
do $$
declare r record; c text;
begin
  for r in select id, despacho_id from public.clientes where codigo is null or codigo !~ '^\d{6}$' loop
    loop
      c := lpad(((('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint) % 1000000)::text, 6, '0');
      exit when not exists (select 1 from public.clientes where despacho_id = r.despacho_id and codigo = c);
    end loop;
    update public.clientes set codigo = c where id = r.id;
  end loop;
end $$;

-- Para que el equipo pueda dar un código nuevo a un cliente (por ejemplo, si lo ha compartido por error).
create or replace function public.regenerar_codigo(p_cliente uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare c text; v_desp uuid := public.mi_despacho();
begin
  if not exists (select 1 from public.clientes where id = p_cliente and despacho_id = v_desp) then raise exception 'Cliente no encontrado'; end if;
  loop
    c := lpad(((('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint) % 1000000)::text, 6, '0');
    exit when not exists (select 1 from public.clientes where despacho_id = v_desp and codigo = c);
  end loop;
  perform set_config('bufetea.cambio_codigo', 'si', true);
  update public.clientes set codigo = c where id = p_cliente;
  return c;
end $$;
revoke execute on function public.regenerar_codigo(uuid) from public, anon;
grant execute on function public.regenerar_codigo(uuid) to authenticated;

-- RLS en «privado»: ni anon ni authenticated tienen acceso al esquema; esto es una segunda barrera.
alter table privado.credenciales_clio enable row level security;
alter table privado.oauth_estados enable row level security;
alter table privado.webhooks_clio enable row level security;
alter table privado.eventos_recibidos enable row level security;
alter table privado.cursores_sync enable row level security;
alter table privado.handshakes_clio enable row level security;
alter table privado.intentos_codigo enable row level security;

-- Campos protegidos. Se comparan como JSON para no leer campos que una tabla no tiene.
create or replace function public.proteger_campos()
returns trigger language plpgsql set search_path = '' as $$
declare n jsonb := to_jsonb(new); o jsonb := to_jsonb(old); k text;
  del_programa text[] := case tg_table_name
    when 'clientes' then array['nombre', 'email', 'telefono', 'tipo']
    when 'asuntos' then array['numero', 'descripcion', 'area', 'abogado', 'estado', 'fecha_apertura', 'fecha_cierre', 'cliente_id']
    else array[]::text[] end;
begin
  if public.llamada_interna() then return new; end if;
  foreach k in array array['despacho_id', 'origen', 'id_externo'] loop
    if n -> k is distinct from o -> k then raise exception 'Este campo no se puede cambiar.'; end if;
  end loop;
  if tg_table_name = 'clientes' and n -> 'codigo' is distinct from o -> 'codigo'
     and coalesce(current_setting('bufetea.cambio_codigo', true), '') <> 'si' then
    raise exception 'El código de verificación lo genera Bufetea.';
  end if;
  -- Lo que llega del programa de gestión se cambia allí; Bufetea nunca escribe en él.
  if o ->> 'origen' not in ('manual', 'csv') then
    foreach k in array del_programa loop
      if n -> k is distinct from o -> k then
        raise exception 'Este dato viene de tu programa de gestión: cámbialo allí y se actualizará solo.';
      end if;
    end loop;
  end if;
  return new;
end $$;

create table if not exists public.solicitudes_conexion (
  id bigint generated always as identity primary key,
  despacho_id uuid not null references public.despachos(id) on delete cascade,
  programa text not null check (char_length(programa) between 2 and 80),
  comentario text check (comentario is null or char_length(comentario) <= 1000),
  solicitado_por uuid references auth.users(id),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'revisada', 'compatible', 'no_compatible')),
  creada timestamptz not null default now()
);
alter table public.solicitudes_conexion enable row level security;
create policy "ver mis solicitudes de conexion" on public.solicitudes_conexion for select to authenticated
  using (despacho_id = (select public.mi_despacho()) or (select public.es_bufetea_admin()));
create policy "pedir comprobar mi programa" on public.solicitudes_conexion for insert to authenticated
  with check (despacho_id = (select public.mi_despacho()) and solicitado_por = (select auth.uid()) and estado = 'pendiente');
