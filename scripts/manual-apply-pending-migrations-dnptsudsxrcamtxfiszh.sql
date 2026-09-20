-- OPERACIÓN MANUAL ÚNICA — proyecto Supabase TiendaPro dnptsudsxrcamtxfiszh
-- Ejecutar SOLO en SQL Editor (Dashboard). No db push masivo.
-- Orden: 1 → 2 → 3. Verificar con: node scripts/verify-pending-installer-migrations.mjs

-- ========== 1/3 — 20260920213000_reference_branding_runtime.sql ==========
update public.platform_installations
set branding_config = jsonb_build_object(
  'brandName', 'TiendaPro',
  'tagline', 'Plataforma comercial y operaciones',
  'logoUrl', '/brand/icons/logo-tiendapro-icon.png',
  'faviconUrl', '/brand/icons/favicon-32.png',
  'primaryColor', '#0a8f5c',
  'secondaryColor', '#0860e8',
  'fontFamily', 'var(--font-plus-jakarta)',
  'contactEmail', 'hola@tiendapro.net',
  'platformMode', true
),
updated_at = now()
where company_slug = 'tiendapro-reference';

-- ========== 2/3 — 20260920220000_installation_resource_grants.sql ==========
create table if not exists public.installation_resource_grants (
  id uuid primary key default gen_random_uuid(),
  installation_id uuid not null references public.platform_installations(id) on delete cascade,
  environment text not null default 'preview'
    check (environment in ('production', 'staging', 'preview')),
  github_repo text not null,
  vercel_project text not null,
  supabase_project_ref text not null,
  primary_domain text,
  deploy_branch text not null,
  scopes text[] not null default array['verify', 'env_write', 'deploy_preview', 'migrations_verify', 'smoke'],
  active boolean not null default true,
  authorized_at timestamptz not null default now(),
  notes text,
  unique (installation_id, environment)
);

create index if not exists installation_resource_grants_installation_idx
  on public.installation_resource_grants(installation_id)
  where active = true;

alter table public.installation_resource_grants enable row level security;

drop policy if exists "installation_grants_read_control" on public.installation_resource_grants;
create policy "installation_grants_read_control"
  on public.installation_resource_grants for select to authenticated
  using (public.is_control_operator());

drop policy if exists "installation_grants_write_owner" on public.installation_resource_grants;
create policy "installation_grants_write_owner"
  on public.installation_resource_grants for all to authenticated
  using (public.is_control_owner())
  with check (public.is_control_owner());

grant select on public.installation_resource_grants to authenticated;

-- ========== 3/3 — 20260920230000_installation_preview_validated.sql ==========
alter table public.platform_installations
  drop constraint if exists platform_installations_lifecycle_status_check;

alter table public.platform_installations
  add constraint platform_installations_lifecycle_status_check
  check (lifecycle_status in (
    'draft', 'provisioning', 'preview_validated', 'live', 'paused', 'failed', 'archived'
  ));

alter table public.installation_resource_grants
  add column if not exists resource_tier text not null default 'client_owned'
  check (resource_tier in ('platform_test', 'client_owned'));
