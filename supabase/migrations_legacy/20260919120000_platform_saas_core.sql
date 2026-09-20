-- =============================================================================
-- TiendaPro SaaS — núcleo multicliente (ADDITIVO)
-- Proyecto esperado: lwenyboejvwuopsenrwx
-- NO elimina tablas legacy (catálogo, costos, cotizaciones).
-- Aplicar SOLO tras verificar proyecto Supabase TiendaPro y autorización explícita.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Referencia: catálogo de módulos y planes (datos maestros)
-- ---------------------------------------------------------------------------
create table if not exists public.module_catalog (
  module_id text primary key,
  name text not null,
  migration_namespace text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.commercial_plans (
  plan_id text primary key,
  name text not null,
  base_price_cents integer not null default 0 check (base_price_cents >= 0),
  included_modules text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Tenants (clientes SaaS de TiendaPro)
-- ---------------------------------------------------------------------------
create table if not exists public.tenants (
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

create index if not exists tenants_slug_idx on public.tenants(slug);
create index if not exists tenants_status_idx on public.tenants(status);

-- ---------------------------------------------------------------------------
-- TiendaPro Control — operadores propietario (distinto de membresías tenant)
-- ---------------------------------------------------------------------------
create table if not exists public.control_operators (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'operator'
    check (role in ('owner', 'operator', 'viewer')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Membresías usuario ↔ tenant (App cliente)
-- ---------------------------------------------------------------------------
create table if not exists public.tenant_memberships (
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

create index if not exists tenant_memberships_user_idx on public.tenant_memberships(user_id);
create index if not exists tenant_memberships_tenant_idx on public.tenant_memberships(tenant_id);

-- ---------------------------------------------------------------------------
-- Activaciones de módulos por tenant
-- ---------------------------------------------------------------------------
create table if not exists public.tenant_module_activations (
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

create index if not exists tenant_module_activations_tenant_idx
  on public.tenant_module_activations(tenant_id);

-- ---------------------------------------------------------------------------
-- Proyectos plataforma (por tenant)
-- ---------------------------------------------------------------------------
create table if not exists public.platform_projects (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  status text not null default 'active'
    check (status in ('active', 'archived')),
  created_at timestamptz not null default now()
);

create index if not exists platform_projects_tenant_idx on public.platform_projects(tenant_id);

-- ---------------------------------------------------------------------------
-- Auditoría plataforma
-- ---------------------------------------------------------------------------
create table if not exists public.platform_audit_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists platform_audit_log_tenant_idx on public.platform_audit_log(tenant_id);
create index if not exists platform_audit_log_created_idx on public.platform_audit_log(created_at desc);

-- ---------------------------------------------------------------------------
-- Helpers JWT / sesión
-- ---------------------------------------------------------------------------
create or replace function public.is_control_operator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.control_operators
    where user_id = auth.uid()
  );
$$;

create or replace function public.is_control_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.control_operators
    where user_id = auth.uid() and role = 'owner'
  );
$$;

create or replace function public.has_tenant_membership(p_tenant_id uuid, p_roles text[] default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = p_tenant_id
      and tm.user_id = auth.uid()
      and tm.status = 'active'
      and (p_roles is null or tm.role = any(p_roles))
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.module_catalog enable row level security;
alter table public.commercial_plans enable row level security;
alter table public.tenants enable row level security;
alter table public.control_operators enable row level security;
alter table public.tenant_memberships enable row level security;
alter table public.tenant_module_activations enable row level security;
alter table public.platform_projects enable row level security;
alter table public.platform_audit_log enable row level security;

-- Catálogo / planes: lectura autenticada; escritura solo control owner
create policy "module_catalog_read_auth"
  on public.module_catalog for select to authenticated
  using (true);

create policy "module_catalog_write_control"
  on public.module_catalog for all to authenticated
  using (public.is_control_owner())
  with check (public.is_control_owner());

create policy "commercial_plans_read_auth"
  on public.commercial_plans for select to authenticated
  using (true);

create policy "commercial_plans_write_control"
  on public.commercial_plans for all to authenticated
  using (public.is_control_owner())
  with check (public.is_control_owner());

-- Tenants: control ve todos; miembros ven su tenant
create policy "tenants_select_control"
  on public.tenants for select to authenticated
  using (public.is_control_operator());

create policy "tenants_select_member"
  on public.tenants for select to authenticated
  using (public.has_tenant_membership(id));

create policy "tenants_write_control"
  on public.tenants for all to authenticated
  using (public.is_control_owner())
  with check (public.is_control_owner());

-- Control operators: solo control owner gestiona; operadores leen
create policy "control_operators_select"
  on public.control_operators for select to authenticated
  using (public.is_control_operator() or user_id = auth.uid());

create policy "control_operators_write_owner"
  on public.control_operators for all to authenticated
  using (public.is_control_owner())
  with check (public.is_control_owner());

-- Membresías: control owner administra; usuarios ven las suyas
create policy "tenant_memberships_select_self"
  on public.tenant_memberships for select to authenticated
  using (user_id = auth.uid() or public.is_control_operator());

create policy "tenant_memberships_write_control"
  on public.tenant_memberships for all to authenticated
  using (public.is_control_owner())
  with check (public.is_control_owner());

-- Módulos tenant: miembros admin del tenant o control
create policy "tenant_modules_select"
  on public.tenant_module_activations for select to authenticated
  using (
    public.is_control_operator()
    or public.has_tenant_membership(tenant_id, array['owner', 'admin', 'operator', 'viewer'])
  );

create policy "tenant_modules_write"
  on public.tenant_module_activations for all to authenticated
  using (
    public.is_control_owner()
    or public.has_tenant_membership(tenant_id, array['owner', 'admin'])
  )
  with check (
    public.is_control_owner()
    or public.has_tenant_membership(tenant_id, array['owner', 'admin'])
  );

-- Proyectos: aislamiento por tenant
create policy "platform_projects_select"
  on public.platform_projects for select to authenticated
  using (
    public.is_control_operator()
    or public.has_tenant_membership(tenant_id)
  );

create policy "platform_projects_write"
  on public.platform_projects for all to authenticated
  using (
    public.is_control_owner()
    or public.has_tenant_membership(tenant_id, array['owner', 'admin', 'operator'])
  )
  with check (
    public.is_control_owner()
    or public.has_tenant_membership(tenant_id, array['owner', 'admin', 'operator'])
  );

-- Auditoría: insert control o miembro tenant; lectura acotada
create policy "platform_audit_select"
  on public.platform_audit_log for select to authenticated
  using (
    public.is_control_operator()
    or (tenant_id is not null and public.has_tenant_membership(tenant_id, array['owner', 'admin']))
  );

create policy "platform_audit_insert"
  on public.platform_audit_log for insert to authenticated
  with check (
    public.is_control_operator()
    or (tenant_id is not null and public.has_tenant_membership(tenant_id, array['owner', 'admin', 'operator']))
  );

-- ---------------------------------------------------------------------------
-- Seeds maestros (idempotentes)
-- ---------------------------------------------------------------------------
insert into public.module_catalog (module_id, name, migration_namespace) values
  ('venta-online', 'Venta online', 'mod_venta_online'),
  ('stock', 'Stock', 'mod_stock'),
  ('pos', 'POS / Caja', 'mod_pos'),
  ('crm', 'Clientes / CRM', 'mod_crm'),
  ('chatbot', 'Chatbot', 'mod_chatbot'),
  ('delivery', 'Delivery', 'mod_delivery'),
  ('finanzas', 'Finanzas', 'mod_finanzas'),
  ('reportes', 'Reportes', 'mod_reportes')
on conflict (module_id) do nothing;

insert into public.commercial_plans (plan_id, name, base_price_cents, included_modules) values
  ('starter', 'Starter', 8900000, array['venta-online', 'reportes']::text[]),
  ('growth', 'Growth', 18900000, array['venta-online', 'pos', 'stock', 'crm', 'reportes']::text[]),
  ('enterprise', 'Enterprise', 44900000, array['venta-online', 'stock', 'pos', 'crm', 'chatbot', 'delivery', 'finanzas', 'reportes']::text[]),
  ('custom', 'Custom', 0, array[]::text[])
on conflict (plan_id) do nothing;

-- Demo tenant (opcional post-migración; comentar si no se desea seed en prod)
-- insert into public.tenants (slug, display_name, plan_id) values
--   ('horizonte-demo', 'Horizonte Labs (demo)', 'growth')
-- on conflict (slug) do nothing;
