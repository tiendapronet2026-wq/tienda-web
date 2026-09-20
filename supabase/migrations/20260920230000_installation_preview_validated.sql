-- Etapa 4: distinguir preview validada vs live independiente.
alter table public.platform_installations
  drop constraint if exists platform_installations_lifecycle_status_check;

alter table public.platform_installations
  add constraint platform_installations_lifecycle_status_check
  check (lifecycle_status in (
    'draft', 'provisioning', 'preview_validated', 'live', 'paused', 'failed', 'archived'
  ));

-- Tier de recursos autorizados (requiere tabla installation_resource_grants).
alter table public.installation_resource_grants
  add column if not exists resource_tier text not null default 'client_owned'
  check (resource_tier in ('platform_test', 'client_owned'));
