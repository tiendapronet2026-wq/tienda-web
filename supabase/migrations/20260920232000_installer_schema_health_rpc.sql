-- Verificador de esquema instalador (service_role).
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
    'migration_versions_expected', jsonb_build_array(
      '20260920213000', '20260920220000', '20260920230000', '20260920232000'
    ),
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
