-- Autorización explícita por instalación (allowlist global sigue activa en código).
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

create policy "installation_grants_read_control"
  on public.installation_resource_grants for select to authenticated
  using (public.is_control_operator());

create policy "installation_grants_write_owner"
  on public.installation_resource_grants for all to authenticated
  using (public.is_control_owner())
  with check (public.is_control_owner());

grant select on public.installation_resource_grants to authenticated;
