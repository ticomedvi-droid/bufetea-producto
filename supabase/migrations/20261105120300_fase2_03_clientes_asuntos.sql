-- Fase 2 · Migración 3 · Clientes y asuntos: fichas completas, alta manual, importación y asunto con varios clientes.
-- Solo añade. Las filas creadas a mano o por CSV reciben un id_externo interno negativo (secuencia propia),
-- así no hace falta tocar la restricción NOT NULL que usa la sincronización con el programa de gestión.

create sequence if not exists public.id_interno_seq as bigint increment by -1 start with -1 maxvalue -1 no cycle;

-- ---------- Clientes ----------
alter table public.clientes
  add column if not exists idioma text not null default 'es' check (idioma ~ '^[a-z]{2,3}$'),
  add column if not exists canal text not null default 'whatsapp' check (canal in ('whatsapp', 'email')),
  add column if not exists dni text check (dni is null or char_length(dni) <= 20),
  add column if not exists notas text check (notas is null or char_length(notas) <= 4000),
  add column if not exists creado_en timestamptz not null default now();
create index if not exists clientes_despacho_nombre on public.clientes (despacho_id, lower(nombre));
create index if not exists clientes_despacho_dni on public.clientes (despacho_id, upper(dni)) where dni is not null;

-- ---------- Asuntos ----------
alter table public.asuntos
  add column if not exists procedimiento text check (procedimiento is null or char_length(procedimiento) <= 80),
  add column if not exists juzgado text check (juzgado is null or char_length(juzgado) <= 200),
  add column if not exists tipo_procedimiento text check (tipo_procedimiento is null or char_length(tipo_procedimiento) <= 80),
  add column if not exists abogado_id uuid references public.perfiles(id) on delete set null,
  add column if not exists situacion text not null default 'abierto' check (situacion in ('abierto', 'cerrado', 'archivado')),
  add column if not exists duplicado_de uuid references public.asuntos(id) on delete set null,
  add column if not exists notas text check (notas is null or char_length(notas) <= 4000),
  add column if not exists creado_en timestamptz not null default now();
create index if not exists asuntos_despacho_procedimiento on public.asuntos (despacho_id, procedimiento) where procedimiento is not null;
create index if not exists asuntos_despacho_situacion on public.asuntos (despacho_id, situacion) where not eliminado;

-- Situación de los asuntos que vienen del programa de gestión: se traduce de su estado (Open, Pending, Closed…).
update public.asuntos set situacion = 'cerrado' where origen not in ('manual', 'csv') and lower(coalesce(estado, '')) in ('closed', 'cerrado');

-- Un asunto puede tener varios clientes. asuntos.cliente_id se conserva como cliente principal.
create table if not exists public.asunto_clientes (
  asunto_id uuid not null references public.asuntos(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  despacho_id uuid not null references public.despachos(id) on delete cascade,
  creado_en timestamptz not null default now(),
  primary key (asunto_id, cliente_id)
);
create index if not exists asunto_clientes_cliente on public.asunto_clientes (cliente_id);
insert into public.asunto_clientes (asunto_id, cliente_id, despacho_id)
  select id, cliente_id, despacho_id from public.asuntos where cliente_id is not null
  on conflict do nothing;

-- ---------- Disparadores ----------
create or replace function public.filas_internas_antes()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.id_externo is null then
    if new.origen = 'clio' then new.origen := 'manual'; end if;
    new.id_externo := nextval('public.id_interno_seq');
  end if;
  return new;
end $$;
drop trigger if exists clientes_internos on public.clientes;
create trigger clientes_internos before insert on public.clientes for each row execute function public.filas_internas_antes();
drop trigger if exists asuntos_internos on public.asuntos;
create trigger asuntos_internos before insert on public.asuntos for each row execute function public.filas_internas_antes();

-- Desde la app no se cambian ni el despacho, ni el origen, ni el código de verificación (el código lo genera Bufetea).
create or replace function public.proteger_campos()
returns trigger language plpgsql set search_path = '' as $$
begin
  if public.llamada_interna() then return new; end if;
  if new.despacho_id is distinct from old.despacho_id or new.origen is distinct from old.origen or new.id_externo is distinct from old.id_externo then
    raise exception 'Este campo no se puede cambiar.';
  end if;
  if tg_table_name = 'clientes' and new.codigo is distinct from old.codigo then
    raise exception 'El código de verificación lo genera Bufetea.';
  end if;
  return new;
end $$;
drop trigger if exists clientes_proteger on public.clientes;
create trigger clientes_proteger before update on public.clientes for each row execute function public.proteger_campos();
drop trigger if exists asuntos_proteger on public.asuntos;
create trigger asuntos_proteger before update on public.asuntos for each row execute function public.proteger_campos();

create or replace function public.asuntos_situacion()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.origen not in ('manual', 'csv') and (tg_op = 'INSERT' or new.estado is distinct from old.estado) then
    new.situacion := case when lower(coalesce(new.estado, '')) in ('closed', 'cerrado') then 'cerrado' else 'abierto' end;
  end if;
  return new;
end $$;
drop trigger if exists asuntos_situacion on public.asuntos;
create trigger asuntos_situacion before insert or update on public.asuntos for each row execute function public.asuntos_situacion();

-- Mantiene asunto_clientes al día con el cliente principal (también para lo que llega del programa de gestión).
create or replace function public.asuntos_cliente_principal()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.cliente_id is not null then
    insert into public.asunto_clientes (asunto_id, cliente_id, despacho_id) values (new.id, new.cliente_id, new.despacho_id)
    on conflict do nothing;
  end if;
  return new;
end $$;
drop trigger if exists asuntos_cliente_principal on public.asuntos;
create trigger asuntos_cliente_principal after insert or update of cliente_id on public.asuntos
  for each row execute function public.asuntos_cliente_principal();

-- ---------- Permisos de escritura (RLS) ----------
-- Todo el equipo del despacho da de alta y edita clientes y asuntos. No se borra: se marca como eliminado.
create policy "crear clientes" on public.clientes for insert to authenticated
  with check (despacho_id = (select public.mi_despacho()));
create policy "editar clientes" on public.clientes for update to authenticated
  using (despacho_id = (select public.mi_despacho())) with check (despacho_id = (select public.mi_despacho()));
create policy "crear asuntos" on public.asuntos for insert to authenticated
  with check (despacho_id = (select public.mi_despacho()));
create policy "editar asuntos" on public.asuntos for update to authenticated
  using (despacho_id = (select public.mi_despacho())) with check (despacho_id = (select public.mi_despacho()));

alter table public.asunto_clientes enable row level security;
create policy "ver clientes de asuntos" on public.asunto_clientes for select to authenticated
  using (despacho_id = (select public.mi_despacho()));
create policy "unir clientes a asuntos" on public.asunto_clientes for insert to authenticated
  with check (despacho_id = (select public.mi_despacho())
              and exists (select 1 from public.asuntos a where a.id = asunto_id and a.despacho_id = (select public.mi_despacho()))
              and exists (select 1 from public.clientes c where c.id = cliente_id and c.despacho_id = (select public.mi_despacho())));
create policy "separar clientes de asuntos" on public.asunto_clientes for delete to authenticated
  using (despacho_id = (select public.mi_despacho()));

-- ---------- Importación desde CSV o Excel ----------
-- p_filas: [{ "cliente": {nombre, email, telefono, dni, idioma, canal}, "asunto": {numero, procedimiento, juzgado, descripcion, area, tipo_procedimiento, abogado, fase, situacion} }]
-- Busca cada cliente por DNI, email, teléfono o nombre; cada asunto por número o por procedimiento. Lo nuevo se crea y lo existente se completa.
create or replace function public.importar_filas(p_filas jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_desp uuid := public.mi_despacho();
  f record; c jsonb; a jsonb;
  v_cli uuid; v_asu uuid; v_origen text;
  n_cli_nuevos int := 0; n_cli_act int := 0; n_asu_nuevos int := 0; n_asu_act int := 0;
  errores jsonb := '[]'::jsonb;
  v_nombre text; v_email text; v_tel text; v_dni text; v_idioma text; v_canal text;
  v_num text; v_proc text; v_sit text;
begin
  if v_desp is null then raise exception 'Primero crea tu despacho.'; end if;
  if jsonb_typeof(p_filas) <> 'array' then raise exception 'Formato no válido.'; end if;
  if jsonb_array_length(p_filas) > 5000 then raise exception 'Como máximo 5.000 filas por importación.'; end if;

  for f in select value as fila, ordinality as n from jsonb_array_elements(p_filas) with ordinality loop
    begin
      c := coalesce(f.fila -> 'cliente', '{}'::jsonb);
      a := coalesce(f.fila -> 'asunto', '{}'::jsonb);
      v_nombre := nullif(left(trim(coalesce(c ->> 'nombre', '')), 200), '');
      v_email := nullif(lower(left(trim(coalesce(c ->> 'email', '')), 200)), '');
      v_tel := nullif(left(trim(coalesce(c ->> 'telefono', '')), 40), '');
      v_dni := nullif(upper(regexp_replace(coalesce(c ->> 'dni', ''), '[^A-Za-z0-9]', '', 'g')), '');
      v_idioma := nullif(lower(trim(coalesce(c ->> 'idioma', ''))), '');
      v_canal := nullif(lower(trim(coalesce(c ->> 'canal', ''))), '');
      if v_nombre is null then raise exception 'Falta el nombre del cliente.'; end if;
      if v_email is not null and v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then raise exception 'El email «%» no es válido.', v_email; end if;
      if v_idioma is not null and v_idioma !~ '^[a-z]{2,3}$' then raise exception 'El idioma «%» no es válido: usa el código de dos letras (es, en, ro…).', v_idioma; end if;
      if v_canal is not null and v_canal not in ('whatsapp', 'email') then raise exception 'El canal tiene que ser whatsapp o email.'; end if;

      v_cli := null;
      if v_dni is not null then
        select id into v_cli from public.clientes where despacho_id = v_desp and not eliminado and upper(dni) = v_dni limit 1;
      end if;
      if v_cli is null and v_email is not null then
        select id into v_cli from public.clientes where despacho_id = v_desp and not eliminado and lower(email) = v_email limit 1;
      end if;
      if v_cli is null and v_tel is not null and length(regexp_replace(v_tel, '\D', '', 'g')) >= 9 then
        select id into v_cli from public.clientes where despacho_id = v_desp and not eliminado
          and right(regexp_replace(coalesce(telefono, ''), '\D', '', 'g'), 9) = right(regexp_replace(v_tel, '\D', '', 'g'), 9) limit 1;
      end if;
      if v_cli is null then
        select id into v_cli from public.clientes where despacho_id = v_desp and not eliminado and lower(nombre) = lower(v_nombre) limit 1;
      end if;

      if v_cli is null then
        insert into public.clientes (despacho_id, origen, nombre, email, telefono, dni, idioma, canal)
          values (v_desp, 'csv', v_nombre, v_email, v_tel, v_dni, coalesce(v_idioma, 'es'),
                  coalesce(v_canal, case when v_tel is null and v_email is not null then 'email' else 'whatsapp' end))
          returning id into v_cli;
        n_cli_nuevos := n_cli_nuevos + 1;
      else
        select origen into v_origen from public.clientes where id = v_cli;
        if v_origen in ('manual', 'csv') then
          update public.clientes set email = coalesce(v_email, email), telefono = coalesce(v_tel, telefono), dni = coalesce(v_dni, dni),
                 idioma = coalesce(v_idioma, idioma), canal = coalesce(v_canal, canal) where id = v_cli;
        else
          -- Lo que viene del programa de gestión no se pisa: solo se completan los datos propios de Bufetea.
          update public.clientes set dni = coalesce(dni, v_dni), idioma = coalesce(v_idioma, idioma), canal = coalesce(v_canal, canal) where id = v_cli;
        end if;
        n_cli_act := n_cli_act + 1;
      end if;

      v_num := nullif(left(trim(coalesce(a ->> 'numero', '')), 80), '');
      v_proc := nullif(left(trim(coalesce(a ->> 'procedimiento', '')), 80), '');
      if v_num is not null or v_proc is not null or nullif(trim(coalesce(a ->> 'descripcion', '')), '') is not null then
        v_sit := lower(nullif(trim(coalesce(a ->> 'situacion', '')), ''));
        v_sit := case when v_sit is null then null when v_sit in ('cerrado', 'closed', 'terminado') then 'cerrado'
                      when v_sit in ('archivado', 'archived') then 'archivado' else 'abierto' end;
        v_asu := null;
        if v_num is not null then
          select id into v_asu from public.asuntos where despacho_id = v_desp and not eliminado and numero = v_num limit 1;
        end if;
        if v_asu is null and v_proc is not null then
          select id into v_asu from public.asuntos where despacho_id = v_desp and not eliminado and procedimiento = v_proc limit 1;
        end if;
        if v_asu is null then
          insert into public.asuntos (despacho_id, origen, cliente_id, numero, procedimiento, juzgado, descripcion, area, tipo_procedimiento,
                                      abogado, fase_cliente, situacion, fecha_apertura)
            values (v_desp, 'csv', v_cli, v_num, v_proc, nullif(left(trim(coalesce(a ->> 'juzgado', '')), 200), ''),
                    nullif(left(trim(coalesce(a ->> 'descripcion', '')), 500), ''), nullif(left(trim(coalesce(a ->> 'area', '')), 80), ''),
                    nullif(left(trim(coalesce(a ->> 'tipo_procedimiento', '')), 80), ''), nullif(left(trim(coalesce(a ->> 'abogado', '')), 120), ''),
                    nullif(left(trim(coalesce(a ->> 'fase', '')), 200), ''), coalesce(v_sit, 'abierto'), current_date)
            returning id into v_asu;
          n_asu_nuevos := n_asu_nuevos + 1;
        else
          select origen into v_origen from public.asuntos where id = v_asu;
          if v_origen in ('manual', 'csv') then
            update public.asuntos set procedimiento = coalesce(v_proc, procedimiento),
                   juzgado = coalesce(nullif(left(trim(coalesce(a ->> 'juzgado', '')), 200), ''), juzgado),
                   descripcion = coalesce(nullif(left(trim(coalesce(a ->> 'descripcion', '')), 500), ''), descripcion),
                   area = coalesce(nullif(left(trim(coalesce(a ->> 'area', '')), 80), ''), area),
                   tipo_procedimiento = coalesce(nullif(left(trim(coalesce(a ->> 'tipo_procedimiento', '')), 80), ''), tipo_procedimiento),
                   abogado = coalesce(nullif(left(trim(coalesce(a ->> 'abogado', '')), 120), ''), abogado),
                   fase_cliente = coalesce(nullif(left(trim(coalesce(a ->> 'fase', '')), 200), ''), fase_cliente),
                   situacion = coalesce(v_sit, situacion),
                   cliente_id = coalesce(cliente_id, v_cli)
             where id = v_asu;
          else
            update public.asuntos set procedimiento = coalesce(procedimiento, v_proc),
                   juzgado = coalesce(juzgado, nullif(left(trim(coalesce(a ->> 'juzgado', '')), 200), '')),
                   tipo_procedimiento = coalesce(tipo_procedimiento, nullif(left(trim(coalesce(a ->> 'tipo_procedimiento', '')), 80), ''))
             where id = v_asu;
          end if;
          n_asu_act := n_asu_act + 1;
        end if;
        insert into public.asunto_clientes (asunto_id, cliente_id, despacho_id) values (v_asu, v_cli, v_desp) on conflict do nothing;
      end if;
    exception when others then
      errores := errores || jsonb_build_object('fila', f.n, 'error', sqlerrm);
    end;
  end loop;

  return jsonb_build_object('clientes_nuevos', n_cli_nuevos, 'clientes_actualizados', n_cli_act,
                            'asuntos_nuevos', n_asu_nuevos, 'asuntos_actualizados', n_asu_act, 'errores', errores);
end $$;

revoke execute on function public.importar_filas(jsonb) from public, anon;
grant execute on function public.importar_filas(jsonb) to authenticated;
revoke execute on function public.filas_internas_antes(), public.proteger_campos(), public.asuntos_situacion(), public.asuntos_cliente_principal()
  from public, anon, authenticated;
grant usage on sequence public.id_interno_seq to authenticated;
