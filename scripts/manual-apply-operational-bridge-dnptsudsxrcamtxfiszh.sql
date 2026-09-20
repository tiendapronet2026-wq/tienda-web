-- =============================================================================
-- TIENDAPRO puente operativo v1 — SOLO proyecto Supabase ref dnptsudsxrcamtxfiszh
-- Ejecutar en SQL Editor (una o más veces; idempotente). NO usar en Casa León / Pulso / Australes.
-- Equivalente: supabase/migrations/20260921043000_operational_bridge.sql
--            + supabase/migrations/20260921051500_bridge_v1_hardening.sql
-- Verificar app: npm test — demo remoto solo tras BRIDGE_API_SECRET + E2E real (no declarar PASS aquí).
-- =============================================================================

begin;

create table if not exists public.bridge_projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_name text not null,
  github_repo text not null,
  supabase_project_ref text not null,
  vercel_project text,
  circuit_validated boolean not null default false,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bridge_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.bridge_projects(id) on delete restrict,
  title text not null,
  instruction text not null,
  risk_class text not null check (risk_class in ('minor', 'critical')),
  status text not null default 'pending_approval'
    check (status in (
      'pending_approval',
      'approved',
      'dispatched',
      'running',
      'completed',
      'failed',
      'cancelled'
    )),
  approval_required boolean not null default true,
  owner_approved_at timestamptz,
  owner_approved_by uuid references auth.users(id),
  source text not null default 'control_ui'
    check (source in ('control_ui', 'bridge_api', 'github')),
  resources jsonb not null default '{}'::jsonb,
  executor text not null default 'manual'
    check (executor in ('manual', 'github_issue', 'cursor_api')),
  external_ref text,
  result_report jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bridge_tasks_project_idx on public.bridge_tasks(project_id);
create index if not exists bridge_tasks_status_idx on public.bridge_tasks(status);
create index if not exists bridge_tasks_created_idx on public.bridge_tasks(created_at desc);

create table if not exists public.bridge_task_events (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.bridge_tasks(id) on delete cascade,
  event_type text not null,
  summary text not null,
  payload jsonb not null default '{}'::jsonb,
  actor text not null default 'system',
  created_at timestamptz not null default now()
);

create index if not exists bridge_task_events_task_idx on public.bridge_task_events(task_id, created_at desc);

alter table public.bridge_projects enable row level security;
alter table public.bridge_tasks enable row level security;
alter table public.bridge_task_events enable row level security;

drop policy if exists bridge_projects_read_control on public.bridge_projects;
create policy bridge_projects_read_control on public.bridge_projects
  for select to authenticated
  using (public.is_control_operator());

drop policy if exists bridge_projects_write_owner on public.bridge_projects;
create policy bridge_projects_write_owner on public.bridge_projects
  for all to authenticated
  using (public.is_control_owner())
  with check (public.is_control_owner());

drop policy if exists bridge_tasks_read_control on public.bridge_tasks;
create policy bridge_tasks_read_control on public.bridge_tasks
  for select to authenticated
  using (public.is_control_operator());

drop policy if exists bridge_tasks_insert_control on public.bridge_tasks;
create policy bridge_tasks_insert_control on public.bridge_tasks
  for insert to authenticated
  with check (public.is_control_operator());

drop policy if exists bridge_tasks_update_owner on public.bridge_tasks;
create policy bridge_tasks_update_owner on public.bridge_tasks
  for update to authenticated
  using (public.is_control_owner())
  with check (public.is_control_owner());

drop policy if exists bridge_task_events_read_control on public.bridge_task_events;
create policy bridge_task_events_read_control on public.bridge_task_events
  for select to authenticated
  using (public.is_control_operator());

drop policy if exists bridge_task_events_insert_control on public.bridge_task_events;
create policy bridge_task_events_insert_control on public.bridge_task_events
  for insert to authenticated
  with check (public.is_control_operator());

grant select, insert, update on public.bridge_projects to authenticated;
grant select, insert, update on public.bridge_tasks to authenticated;
grant select, insert on public.bridge_task_events to authenticated;

grant all on public.bridge_projects to service_role;
grant all on public.bridge_tasks to service_role;
grant all on public.bridge_task_events to service_role;

insert into public.bridge_projects (
  slug,
  display_name,
  github_repo,
  supabase_project_ref,
  vercel_project,
  circuit_validated,
  metadata
) values (
  'tiendapro',
  'TiendaPro (piloto)',
  'tiendapronet2026-wq/tienda-web',
  'dnptsudsxrcamtxfiszh',
  'tienda-web',
  false,
  jsonb_build_object(
    'scope', 'pilot',
    'note', 'Único proyecto conectado al puente v1. Casa León / Pulso / Australes excluidos.'
  )
) on conflict (slug) do update set
  display_name = excluded.display_name,
  github_repo = excluded.github_repo,
  supabase_project_ref = excluded.supabase_project_ref,
  vercel_project = excluded.vercel_project,
  metadata = excluded.metadata,
  updated_at = now();

insert into supabase_migrations.schema_migrations (version, name)
values ('20260921043000', 'operational_bridge')
on conflict (version) do update set name = excluded.name;

-- Hardening: no marcar circuito validado hasta E2E remoto real
update public.bridge_projects
set circuit_validated = false,
    updated_at = now()
where slug = 'tiendapro'
  and supabase_project_ref = 'dnptsudsxrcamtxfiszh';

insert into supabase_migrations.schema_migrations (version, name)
values ('20260921051500', 'bridge_v1_hardening')
on conflict (version) do update set name = excluded.name;

commit;
