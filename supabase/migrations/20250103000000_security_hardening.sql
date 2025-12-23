-- Hardening for functions, view, and RLS policies.

-- 1) Ensure deterministic search_path on handle_new_user
create or replace function public.handle_new_user()
returns trigger
set search_path = public
language plpgsql
security definer
as $$
begin
  insert into public.profiles (user_id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email), new.email)
  on conflict (user_id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- 2) Make project_forecast_status explicitly security invoker
alter view public.project_forecast_status set (security_invoker = on);

-- 3) Add RLS policies for user_roles (already RLS-enabled)
create policy "user_roles self select" on public.user_roles
  for select using (auth.uid() = user_id);

create policy "user_roles admin select" on public.user_roles
  for select using (
    exists(select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin')
  );

create policy "user_roles service insert" on public.user_roles
  for insert with check (auth.role() = 'service_role');

create policy "user_roles admin insert" on public.user_roles
  for insert with check (
    exists(select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin')
  );

create policy "user_roles admin update" on public.user_roles
  for update using (
    exists(select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin')
  );
