-- =============================================================================
-- TIENDAPRO dnptsudsxrcamtxfiszh — aplicación manual ÚNICA (SQL Editor, una ejecución)
-- Registra cada versión en supabase_migrations.schema_migrations (historial oficial).
-- Alternativa CLI (mismo resultado): supabase link + supabase db push --include-all
--   limitando a versiones 20260920213000 … 20260920232000 (sin push masivo ciego).
-- Verificar después: node scripts/verify-pending-installer-migrations.mjs
-- =============================================================================

begin;

-- 1/4 reference_branding_runtime
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

insert into supabase_migrations.schema_migrations (version, name)
values ('20260920213000', 'reference_branding_runtime')
on conflict (version) do update set name = excluded.name;

-- 2/4 installation_resource_grants
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
  resource_tier text not null default 'client_owned'
    check (resource_tier in ('platform_test', 'client_owned')),
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
drop policy if exists "installation_grants_insert_owner" on public.installation_resource_grants;
create policy "installation_grants_insert_owner"
  on public.installation_resource_grants for insert to authenticated
  with check (public.is_control_owner());

drop policy if exists "installation_grants_update_owner" on public.installation_resource_grants;
create policy "installation_grants_update_owner"
  on public.installation_resource_grants for update to authenticated
  using (public.is_control_owner())
  with check (public.is_control_owner());

grant select, insert, update on public.installation_resource_grants to authenticated;

insert into supabase_migrations.schema_migrations (version, name)
values ('20260920220000', 'installation_resource_grants')
on conflict (version) do update set name = excluded.name;

-- 3/4 installation_preview_validated
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

insert into supabase_migrations.schema_migrations (version, name)
values ('20260920230000', 'installation_preview_validated')
on conflict (version) do update set name = excluded.name;

-- 4/4 installer_schema_health_rpc
create or replace function public.control_installer_schema_health()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  lifecycle_def text;
  privs text[];
  pols jsonb;
  branding_ok boolean;
  mig record;
  mig_map jsonb := '{}'::jsonb;
begin
  for mig in
    select version, name from supabase_migrations.schema_migrations
    where version in ('20260920213000', '20260920220000', '20260920230000', '20260920232000')
  loop
    mig_map := mig_map || jsonb_build_object(mig.version, mig.name);
  end loop;

  select pg_get_constraintdef(c.oid)
  into lifecycle_def
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'platform_installations'
    and c.conname = 'platform_installations_lifecycle_status_check';

  select coalesce(array_agg(distinct privilege_type order by privilege_type), array[]::text[])
  into privs
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name = 'installation_resource_grants'
    and grantee = 'authenticated';

  select coalesce(jsonb_agg(jsonb_build_object('name', policyname, 'cmd', cmd)), '[]'::jsonb)
  into pols
  from pg_policies
  where schemaname = 'public' and tablename = 'installation_resource_grants';

  select (branding_config->>'brandName' = 'TiendaPro'
    and branding_config->>'primaryColor' = '#0a8f5c'
    and (branding_config ? 'logoUrl'))
  into branding_ok
  from public.platform_installations
  where company_slug = 'tiendapro-reference';

  return jsonb_build_object(
    'project_ref', 'dnptsudsxrcamtxfiszh',
    'migration_versions', mig_map,
    'lifecycle_constraint', lifecycle_def,
    'lifecycle_includes_preview_validated', coalesce(lifecycle_def, '') like '%preview_validated%',
    'grants_authenticated_privileges', to_jsonb(privs),
    'grants_has_insert_update',
      'INSERT' = any(privs) and 'UPDATE' = any(privs) and 'SELECT' = any(privs),
    'policies_installation_resource_grants', pols,
    'policies_include_insert_update',
      exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = 'installation_resource_grants' and p.cmd = 'INSERT')
      and exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = 'installation_resource_grants' and p.cmd = 'UPDATE'),
    'is_control_owner_defined', to_regprocedure('public.is_control_owner()') is not null,
    'is_control_operator_defined', to_regprocedure('public.is_control_operator()') is not null,
    'table_installation_resource_grants_exists', to_regclass('public.installation_resource_grants') is not null,
    'column_resource_tier_exists',
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'installation_resource_grants' and column_name = 'resource_tier'
      ),
    'branding_reference_ok', coalesce(branding_ok, false)
  );
end;
$$;

revoke all on function public.control_installer_schema_health() from public;
grant execute on function public.control_installer_schema_health() to service_role;

insert into supabase_migrations.schema_migrations (version, name)
values ('20260920232000', 'installer_schema_health_rpc')
on conflict (version) do update set name = excluded.name;

commit;

-- Resultado esperado inmediato (solo lectura):
-- select public.control_installer_schema_health();
