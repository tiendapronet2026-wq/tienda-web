-- =============================================================================
-- TiendaPro 3.0 — BASELINE (reconstrucción controlada)
-- PROYECTO AUTORIZADO: dnptsudsxrcamtxfiszh
-- NO aplicar en Casa León ni en ref lwenyboejvwuopsenrwx.
-- Propietario autorizó reinicio de esquema public (sin datos comerciales reales).
-- =============================================================================

create extension if not exists "pgcrypto";

-- Reinicio del esquema public del proyecto TiendaPro autorizado
drop schema if exists public cascade;
create schema public;
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on schema public to postgres, service_role;
alter default privileges in schema public grant all on tables to postgres, service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant select on tables to anon;

-- ---------------------------------------------------------------------------
-- Perfiles (Auth)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  role text not null default 'customer'
    check (role in ('customer', 'admin', 'seller')),
  status text not null default 'active'
    check (status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, first_name, last_name, role, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    'customer',
    'active'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Catálogo módulos y planes
-- ---------------------------------------------------------------------------
create table public.module_catalog (
  module_id text primary key,
  name text not null,
  migration_namespace text not null,
  created_at timestamptz not null default now()
);

create table public.commercial_plans (
  plan_id text primary key,
  name text not null,
  base_price_cents integer not null default 0 check (base_price_cents >= 0),
  included_modules text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Tenants
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_name text not null,
  plan_id text not null references public.commercial_plans(plan_id),
  deployment_mode text not null default 'shared'
    check (deployment_mode in ('shared', 'dedicated')),
  custom_domain text,
  status text not null default 'trial'
    check (status in ('active', 'trial', 'paused')),
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.control_operators (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'operator'
    check (role in ('owner', 'operator', 'viewer')),
  created_at timestamptz not null default now()
);

create table public.tenant_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer'
    check (role in ('owner', 'admin', 'operator', 'viewer')),
  status text not null default 'active'
    check (status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

create table public.tenant_module_activations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  module_id text not null references public.module_catalog(module_id),
  state text not null default 'inactive'
    check (state in ('inactive', 'active', 'suspended')),
  config jsonb not null default '{}'::jsonb,
  activated_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (tenant_id, module_id)
);

create table public.platform_projects (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  status text not null default 'active'
    check (status in ('active', 'archived')),
  created_at timestamptz not null default now()
);

create table public.platform_audit_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Helpers
create or replace function public.is_control_operator()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.control_operators where user_id = auth.uid());
$$;

create or replace function public.is_control_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.control_operators where user_id = auth.uid() and role = 'owner');
$$;

create or replace function public.has_tenant_membership(p_tenant_id uuid, p_roles text[] default null)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.tenant_memberships tm
    where tm.tenant_id = p_tenant_id and tm.user_id = auth.uid() and tm.status = 'active'
      and (p_roles is null or tm.role = any(p_roles))
  );
$$;

-- RLS
alter table public.profiles enable row level security;
alter table public.module_catalog enable row level security;
alter table public.commercial_plans enable row level security;
alter table public.tenants enable row level security;
alter table public.control_operators enable row level security;
alter table public.tenant_memberships enable row level security;
alter table public.tenant_module_activations enable row level security;
alter table public.platform_projects enable row level security;
alter table public.platform_audit_log enable row level security;

create policy "profiles_self" on public.profiles for select to authenticated using (id = auth.uid() or public.is_control_operator());
create policy "profiles_self_update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "module_catalog_read" on public.module_catalog for select to authenticated using (true);
create policy "module_catalog_write" on public.module_catalog for all to authenticated using (public.is_control_owner()) with check (public.is_control_owner());

create policy "plans_read" on public.commercial_plans for select to authenticated using (true);
create policy "plans_write" on public.commercial_plans for all to authenticated using (public.is_control_owner()) with check (public.is_control_owner());

create policy "tenants_control" on public.tenants for select to authenticated using (public.is_control_operator());
create policy "tenants_member" on public.tenants for select to authenticated using (public.has_tenant_membership(id));
create policy "tenants_write" on public.tenants for all to authenticated using (public.is_control_owner()) with check (public.is_control_owner());

create policy "control_ops_read" on public.control_operators for select to authenticated using (public.is_control_operator() or user_id = auth.uid());
create policy "control_ops_write" on public.control_operators for all to authenticated using (public.is_control_owner()) with check (public.is_control_owner());

create policy "memberships_read" on public.tenant_memberships for select to authenticated using (user_id = auth.uid() or public.is_control_operator());
create policy "memberships_write" on public.tenant_memberships for all to authenticated using (public.is_control_owner()) with check (public.is_control_owner());

create policy "tenant_modules_read" on public.tenant_module_activations for select to authenticated using (
  public.is_control_operator() or public.has_tenant_membership(tenant_id)
);
create policy "tenant_modules_write" on public.tenant_module_activations for all to authenticated using (
  public.is_control_owner() or public.has_tenant_membership(tenant_id, array['owner','admin'])
) with check (
  public.is_control_owner() or public.has_tenant_membership(tenant_id, array['owner','admin'])
);

create policy "projects_read" on public.platform_projects for select to authenticated using (
  public.is_control_operator() or public.has_tenant_membership(tenant_id)
);
create policy "projects_write" on public.platform_projects for all to authenticated using (
  public.is_control_owner() or public.has_tenant_membership(tenant_id, array['owner','admin','operator'])
) with check (
  public.is_control_owner() or public.has_tenant_membership(tenant_id, array['owner','admin','operator'])
);

create policy "audit_read" on public.platform_audit_log for select to authenticated using (
  public.is_control_operator() or (tenant_id is not null and public.has_tenant_membership(tenant_id, array['owner','admin']))
);
create policy "audit_insert" on public.platform_audit_log for insert to authenticated with check (
  public.is_control_operator() or (tenant_id is not null and public.has_tenant_membership(tenant_id, array['owner','admin','operator']))
);

-- Seeds maestros
insert into public.module_catalog (module_id, name, migration_namespace) values
  ('venta-online', 'Venta online', 'mod_venta_online'),
  ('stock', 'Stock', 'mod_stock'),
  ('pos', 'POS / Caja', 'mod_pos'),
  ('crm', 'Clientes / CRM', 'mod_crm'),
  ('chatbot', 'Chatbot', 'mod_chatbot'),
  ('delivery', 'Delivery', 'mod_delivery'),
  ('finanzas', 'Finanzas', 'mod_finanzas'),
  ('reportes', 'Reportes', 'mod_reportes');

insert into public.commercial_plans (plan_id, name, base_price_cents, included_modules) values
  ('starter', 'Starter', 0, array['venta-online','reportes']::text[]),
  ('growth', 'Growth', 0, array['venta-online','pos','stock','crm','reportes']::text[]),
  ('enterprise', 'Enterprise', 0, array['venta-online','stock','pos','crm','chatbot','delivery','finanzas','reportes']::text[]),
  ('custom', 'Custom', 0, array[]::text[]);

-- Dos tenants de prueba (sin usuarios; vincular tras registro + SQL control)
insert into public.tenants (slug, display_name, plan_id, status) values
  ('tenant-alpha-test', 'Tenant Alpha (prueba)', 'growth', 'active'),
  ('tenant-beta-test', 'Tenant Beta (prueba)', 'starter', 'active');

insert into public.tenant_module_activations (tenant_id, module_id, state, activated_at)
select t.id, m.module_id, 'active', now()
from public.tenants t
cross join public.module_catalog m
where t.slug = 'tenant-alpha-test'
  and m.module_id = any(array['venta-online','pos','reportes','crm']::text[]);

insert into public.tenant_module_activations (tenant_id, module_id, state, activated_at)
select t.id, m.module_id, 'active', now()
from public.tenants t
cross join public.module_catalog m
where t.slug = 'tenant-beta-test'
  and m.module_id = any(array['venta-online','reportes']::text[]);
