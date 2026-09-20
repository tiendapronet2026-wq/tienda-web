-- Fábrica de sistemas: plantillas, instalaciones, borradores y operaciones (additivo)
-- Sin secretos: metadata de estado únicamente.

create table if not exists public.installation_templates (
  template_id text primary key,
  name text not null,
  description text not null default '',
  business_type text not null default 'general',
  status text not null default 'available'
    check (status in ('available', 'beta', 'coming_soon')),
  default_modules text[] not null default '{}',
  config_schema jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_installations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete set null,
  company_name text not null,
  company_slug text not null unique,
  template_id text not null references public.installation_templates(template_id),
  primary_domain text,
  environment text not null default 'production'
    check (environment in ('production', 'staging', 'preview')),
  lifecycle_status text not null default 'draft'
    check (lifecycle_status in (
      'draft', 'provisioning', 'live', 'paused', 'failed', 'archived'
    )),
  installed_version text,
  enabled_modules text[] not null default '{}',
  github_meta jsonb not null default '{}'::jsonb,
  vercel_meta jsonb not null default '{}'::jsonb,
  supabase_meta jsonb not null default '{}'::jsonb,
  branding_config jsonb not null default '{}'::jsonb,
  is_reference boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists platform_installations_status_idx
  on public.platform_installations(lifecycle_status);
create index if not exists platform_installations_template_idx
  on public.platform_installations(template_id);

create table if not exists public.installation_wizard_drafts (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete set null,
  current_step integer not null default 1 check (current_step between 1 and 9),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'open'
    check (status in ('open', 'completed', 'abandoned')),
  linked_installation_id uuid references public.platform_installations(id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists installation_wizard_drafts_user_idx
  on public.installation_wizard_drafts(created_by, status);

create table if not exists public.installation_operations (
  id uuid primary key default gen_random_uuid(),
  installation_id uuid not null references public.platform_installations(id) on delete cascade,
  operation_type text not null,
  environment text not null default 'production',
  status text not null default 'pending'
    check (status in ('pending', 'running', 'succeeded', 'failed', 'simulated')),
  summary text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  actor_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists installation_operations_installation_idx
  on public.installation_operations(installation_id, created_at desc);

alter table public.installation_templates enable row level security;
alter table public.platform_installations enable row level security;
alter table public.installation_wizard_drafts enable row level security;
alter table public.installation_operations enable row level security;

create policy "installation_templates_read_auth"
  on public.installation_templates for select to authenticated
  using (true);

create policy "installation_templates_write_control"
  on public.installation_templates for all to authenticated
  using (public.is_control_owner())
  with check (public.is_control_owner());

create policy "platform_installations_read_control"
  on public.platform_installations for select to authenticated
  using (public.is_control_operator());

create policy "platform_installations_write_control"
  on public.platform_installations for all to authenticated
  using (public.is_control_owner())
  with check (public.is_control_owner());

create policy "installation_drafts_own_or_control"
  on public.installation_wizard_drafts for select to authenticated
  using (created_by = auth.uid() or public.is_control_operator());

create policy "installation_drafts_insert_auth"
  on public.installation_wizard_drafts for insert to authenticated
  with check (created_by = auth.uid() or public.is_control_owner());

create policy "installation_drafts_update_own_or_control"
  on public.installation_wizard_drafts for update to authenticated
  using (created_by = auth.uid() or public.is_control_owner())
  with check (created_by = auth.uid() or public.is_control_owner());

create policy "installation_operations_read_control"
  on public.installation_operations for select to authenticated
  using (public.is_control_operator());

create policy "installation_operations_write_control"
  on public.installation_operations for insert to authenticated
  with check (public.is_control_owner());

-- Plantillas
insert into public.installation_templates (template_id, name, description, business_type, status, default_modules)
values
  (
    'ecommerce-store-v1',
    'Tienda online (ecommerce)',
    'Catálogo, carrito, checkout, admin comercial y módulos opcionales. Basada en la tienda pública TiendaPro.',
    'retail',
    'available',
    array['venta-online', 'stock', 'crm', 'reportes']
  ),
  (
    'restaurant-v1',
    'Restaurante / menú digital',
    'Reservas, carta y pedidos en mesa — registro preparado, incorporación próxima.',
    'restaurant',
    'coming_soon',
    array['pos', 'delivery']
  ),
  (
    'services-booking-v1',
    'Servicios y turnos',
    'Agenda, cotizaciones y operaciones — registro preparado, incorporación próxima.',
    'services',
    'coming_soon',
    array['crm', 'finanzas']
  )
on conflict (template_id) do update set
  name = excluded.name,
  description = excluded.description,
  status = excluded.status,
  default_modules = excluded.default_modules,
  updated_at = now();

-- Instalación de referencia TiendaPro (sin credenciales en metadata)
insert into public.platform_installations (
  company_name,
  company_slug,
  template_id,
  primary_domain,
  environment,
  lifecycle_status,
  installed_version,
  enabled_modules,
  github_meta,
  vercel_meta,
  supabase_meta,
  branding_config,
  is_reference,
  notes
) values (
  'TiendaPro (instalación de referencia)',
  'tiendapro-reference',
  'ecommerce-store-v1',
  'www.tiendapro.net',
  'production',
  'live',
  '3.0.0',
  array['venta-online', 'stock', 'crm', 'reportes', 'chatbot'],
  jsonb_build_object(
    'status', 'connected',
    'repo', 'tiendapronet2026-wq/tienda-web',
    'default_branch', 'master',
    'note', 'Repositorio productivo existente — no clonar ni rotar tokens desde Control'
  ),
  jsonb_build_object(
    'status', 'connected',
    'project', 'tienda-web',
    'team', 'tiendapronet2026-wqs-projects',
    'production_url', 'https://www.tiendapro.net'
  ),
  jsonb_build_object(
    'status', 'connected',
    'project_ref', 'dnptsudsxrcamtxfiszh',
    'region', 'sa-east-1',
    'isolated', true,
    'note', 'Proyecto Supabase dedicado de esta instalación'
  ),
  jsonb_build_object(
    'brand_name', 'TiendaPro',
    'logo_path', '/brand/icons/logo-tiendapro-icon.png'
  ),
  true,
  'Primera referencia del fabricador. No modificar credenciales ni checkout desde este registro.'
)
on conflict (company_slug) do update set
  lifecycle_status = excluded.lifecycle_status,
  installed_version = excluded.installed_version,
  enabled_modules = excluded.enabled_modules,
  github_meta = excluded.github_meta,
  vercel_meta = excluded.vercel_meta,
  supabase_meta = excluded.supabase_meta,
  updated_at = now();

grant select on public.installation_templates to authenticated;
grant select on public.platform_installations to authenticated;
grant select, insert, update on public.installation_wizard_drafts to authenticated;
grant select, insert on public.installation_operations to authenticated;
