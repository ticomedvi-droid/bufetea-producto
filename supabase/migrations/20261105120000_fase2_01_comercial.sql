-- Fase 2 · Migración 1 · Planes y extras (fuente única: docs/comercial.py). Solo añade tablas.
create table if not exists public.planes (
  id text primary key,
  nombre text not null,
  precio_mes numeric(10,2) not null check (precio_mes >= 0),
  precio_anio numeric(10,2) not null check (precio_anio >= 0),
  asuntos_incluidos int not null check (asuntos_incluidos >= 0),
  exceso_asunto numeric(10,2) not null check (exceso_asunto >= 0),
  para text,
  recomendado boolean not null default false,
  caracteristicas jsonb not null default '[]',
  soporte_prioritario boolean not null default false,
  acompanamiento boolean not null default false,
  orden int not null default 0,
  actualizado_en timestamptz not null default now()
);

create table if not exists public.extras (
  id text primary key,
  nombre text not null,
  subtitulo text,
  precio_mes numeric(10,2) not null check (precio_mes >= 0),
  desde boolean not null default false,
  caracteristicas jsonb not null default '[]',
  nota text,
  pagina text,
  orden int not null default 0,
  actualizado_en timestamptz not null default now()
);

create table if not exists public.plan_extras (
  plan_id text not null references public.planes(id) on delete cascade,
  extra_id text not null references public.extras(id) on delete cascade,
  primary key (plan_id, extra_id)
);

create table if not exists public.comercial_config (
  clave text primary key,
  valor jsonb not null
);

-- Los precios son públicos (los enseña la web): lectura para todos, escritura solo desde migraciones o el panel interno.
alter table public.planes enable row level security;
alter table public.extras enable row level security;
alter table public.plan_extras enable row level security;
alter table public.comercial_config enable row level security;
create policy "precios publicos" on public.planes for select to anon, authenticated using (true);
create policy "precios publicos" on public.extras for select to anon, authenticated using (true);
create policy "precios publicos" on public.plan_extras for select to anon, authenticated using (true);
create policy "precios publicos" on public.comercial_config for select to anon, authenticated using (true);
