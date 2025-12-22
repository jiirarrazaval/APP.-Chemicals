-- Core roles and profile setup
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin','user');
  end if;
end$$;

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users on delete cascade,
  role public.app_role not null default 'user'
);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users on delete cascade,
  full_name text not null,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.capex_data (
  id uuid primary key default gen_random_uuid(),
  ano integer not null,
  mes integer not null check (mes between 1 and 12),
  numero_oi text,
  nombre_proyecto text not null,
  desc_ceco text not null,
  segmento text not null,
  area text,
  tipo_proyecto text not null,
  categoria text not null,
  responsable_3 text not null,
  monto_usd numeric(18,2) not null default 0,
  bdgt_mes_usd numeric(18,2) not null default 0,
  is_forecast boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ano, mes, nombre_proyecto, responsable_3)
);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email), new.email)
  on conflict (user_id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_capex_updated_at
before update on public.capex_data
for each row execute procedure public.set_updated_at();

alter table public.user_roles enable row level security;
alter table public.profiles enable row level security;
alter table public.capex_data enable row level security;

-- Policies for profiles
create policy "profiles owner" on public.profiles
  for select using (auth.uid() = user_id);
create policy "profiles owner update" on public.profiles
  for update using (auth.uid() = user_id);

-- Admin can read everything
create policy "capex admin select" on public.capex_data
  for select using (
    exists(select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin')
  );

create policy "capex admin insert" on public.capex_data
  for insert with check (
    exists(select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin')
  );

create policy "capex admin update" on public.capex_data
  for update using (
    exists(select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin')
  );

-- Users limited to their projects
create policy "capex user select" on public.capex_data
  for select using (
    exists(
      select 1 from public.profiles p where p.user_id = auth.uid() and p.full_name = capex_data.responsable_3
    )
  );

create policy "capex user update forecast" on public.capex_data
  for update using (
    capex_data.is_forecast = true
    and capex_data.mes >= extract(month from now())
    and exists(
      select 1 from public.profiles p where p.user_id = auth.uid() and p.full_name = capex_data.responsable_3
    )
  )
  with check (
    capex_data.is_forecast = true
    and capex_data.mes >= extract(month from now())
    and exists(
      select 1 from public.profiles p where p.user_id = auth.uid() and p.full_name = capex_data.responsable_3
    )
  );

-- Aggregated view for forecast readiness
create or replace view public.project_forecast_status as
with base as (
  select
    coalesce(numero_oi, nombre_proyecto) as project_key,
    nombre_proyecto,
    segmento,
    categoria,
    responsable_3 as responsable,
    mes,
    is_forecast,
    monto_usd,
    bdgt_mes_usd,
    updated_at
  from public.capex_data
  where ano = extract(year from now())
)
select
  project_key,
  nombre_proyecto,
  segmento,
  categoria,
  responsable,
  sum(case when mes <= 8 and is_forecast = false then monto_usd else 0 end) as real_ytd,
  sum(case when mes <= 8 then bdgt_mes_usd else 0 end) as bdgt_ytd,
  coalesce(max(case when mes = 9 then monto_usd end), 0) as forecast_sep,
  coalesce(max(case when mes = 10 then monto_usd end), 0) as forecast_oct,
  coalesce(max(case when mes = 11 then monto_usd end), 0) as forecast_nov,
  coalesce(max(case when mes = 12 then monto_usd end), 0) as forecast_dec,
  max(updated_at) filter (where is_forecast and mes >= 9) as forecast_last_updated_at,
  (
    count(*) filter (where is_forecast and mes in (9,10,11,12)) = 4
    and coalesce(max(updated_at) filter (where is_forecast and mes >= 9), now() - interval '8 days') >= now() - interval '7 days'
  ) as forecast_ready
from base
group by project_key, nombre_proyecto, segmento, categoria, responsable;

comment on view public.project_forecast_status is 'Aggregated forecast readiness per project/responsable.';
