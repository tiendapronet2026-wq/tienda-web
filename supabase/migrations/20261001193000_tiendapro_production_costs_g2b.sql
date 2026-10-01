-- Gate 2B — Procesos productivos (máquinas + mano de obra) + roll-up completo
-- Fuente canónica costo/hora máquina: machines.total_cost_per_hour (ya incluye energía, mantenimiento, depreciación, otros).
-- Fuente canónica MO: labor_rates.cost_per_hour. No sumar energía aparte en el roll-up.

create table if not exists public.product_process_steps (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 160),
  position integer not null check (position > 0),
  batch_size numeric(14, 6) not null default 1 check (batch_size > 0),
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

create unique index if not exists product_process_steps_product_position_idx
  on public.product_process_steps (product_id, position)
  where is_active;

create index if not exists product_process_steps_product_idx
  on public.product_process_steps (product_id)
  where is_active;

drop trigger if exists product_process_steps_updated_at on public.product_process_steps;
create trigger product_process_steps_updated_at
  before update on public.product_process_steps
  for each row execute function public.set_updated_at();

create table if not exists public.product_process_resources (
  id uuid primary key default gen_random_uuid(),
  process_step_id uuid not null references public.product_process_steps(id) on delete cascade,
  resource_type text not null check (resource_type in ('machine', 'labor')),
  machine_id uuid references public.machines(id) on delete restrict,
  labor_rate_id uuid references public.labor_rates(id) on delete restrict,
  run_minutes numeric(14, 6) not null default 0 check (run_minutes >= 0),
  setup_minutes numeric(14, 6) not null default 0 check (setup_minutes >= 0),
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  constraint product_process_resources_type_fk check (
    (resource_type = 'machine' and machine_id is not null and labor_rate_id is null)
    or (resource_type = 'labor' and labor_rate_id is not null and machine_id is null)
  ),
  constraint product_process_resources_minutes check (
    run_minutes > 0 or setup_minutes > 0
  )
);

create unique index if not exists product_process_resources_step_machine_idx
  on public.product_process_resources (process_step_id, machine_id)
  where resource_type = 'machine' and is_active;

create unique index if not exists product_process_resources_step_labor_idx
  on public.product_process_resources (process_step_id, labor_rate_id)
  where resource_type = 'labor' and is_active;

create index if not exists product_process_resources_step_idx
  on public.product_process_resources (process_step_id)
  where is_active;

drop trigger if exists product_process_resources_updated_at on public.product_process_resources;
create trigger product_process_resources_updated_at
  before update on public.product_process_resources
  for each row execute function public.set_updated_at();

comment on column public.product_process_steps.batch_size is
  'Unidades del producto que amortizan el setup del paso (setup_minutes es por lote de este tamaño).';

comment on column public.product_process_resources.run_minutes is
  'Minutos de recurso por unidad de producto terminado.';
comment on column public.product_process_resources.setup_minutes is
  'Minutos de preparación por lote (batch_size del paso).';

-- Costo por unidad de un recurso (run por unidad + setup amortizado).
create or replace function public._process_resource_unit_cost(
  p_cost_per_hour numeric,
  p_run_minutes numeric,
  p_setup_minutes numeric,
  p_batch_size numeric
)
returns numeric
language sql
immutable
as $$
  select round(
    coalesce(p_run_minutes, 0) / 60.0 * coalesce(p_cost_per_hour, 0)
    + (coalesce(p_setup_minutes, 0) / 60.0 * coalesce(p_cost_per_hour, 0)) / greatest(p_batch_size, 0.000001),
    4
  );
$$;

create or replace function public.calculate_product_production_cost(p_product_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_materials numeric;
  v_machine numeric;
  v_labor numeric;
  v_production numeric;
  v_total numeric;
begin
  if not public.is_admin() then
    raise exception 'Acceso denegado';
  end if;

  v_materials := public.calculate_product_material_cost(p_product_id);

  select coalesce(round(sum(
    public._process_resource_unit_cost(
      m.total_cost_per_hour,
      r.run_minutes,
      r.setup_minutes,
      s.batch_size
    )
  )::numeric, 4), 0)
  into v_machine
  from public.product_process_steps s
  inner join public.product_process_resources r on r.process_step_id = s.id
  inner join public.machines m on m.id = r.machine_id
  where s.product_id = p_product_id
    and s.is_active
    and r.is_active
    and r.resource_type = 'machine'
    and m.is_active
    and m.total_cost_per_hour >= 0;

  select coalesce(round(sum(
    public._process_resource_unit_cost(
      l.cost_per_hour,
      r.run_minutes,
      r.setup_minutes,
      s.batch_size
    )
  )::numeric, 4), 0)
  into v_labor
  from public.product_process_steps s
  inner join public.product_process_resources r on r.process_step_id = s.id
  inner join public.labor_rates l on l.id = r.labor_rate_id
  where s.product_id = p_product_id
    and s.is_active
    and r.is_active
    and r.resource_type = 'labor'
    and l.is_active
    and l.cost_per_hour >= 0;

  v_production := round(coalesce(v_machine, 0) + coalesce(v_labor, 0), 4);
  v_total := round(coalesce(v_materials, 0) + v_production, 4);

  return jsonb_build_object(
    'materials_cost', coalesce(v_materials, 0),
    'machine_cost', coalesce(v_machine, 0),
    'labor_cost', coalesce(v_labor, 0),
    'production_cost', v_production,
    'total_cost', v_total
  );
end;
$$;

comment on function public.calculate_product_production_cost(uuid) is
  'Desglose admin-only: materiales (BOM) + máquinas + MO. Usa machines.total_cost_per_hour y labor_rates.cost_per_hour; setup amortizado por batch_size del paso.';

revoke all on function public.calculate_product_production_cost(uuid) from public;
revoke all on function public.calculate_product_production_cost(uuid) from anon;
grant execute on function public.calculate_product_production_cost(uuid) to authenticated;

revoke all on function public._process_resource_unit_cost(numeric, numeric, numeric, numeric) from public;

alter table public.product_process_steps enable row level security;
alter table public.product_process_resources enable row level security;

drop policy if exists "Procesos: solo admin" on public.product_process_steps;
create policy "Procesos: solo admin"
  on public.product_process_steps for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Procesos: sin acceso público" on public.product_process_steps;
create policy "Procesos: sin acceso público"
  on public.product_process_steps for all to anon
  using (false)
  with check (false);

drop policy if exists "Proceso recursos: solo admin" on public.product_process_resources;
create policy "Proceso recursos: solo admin"
  on public.product_process_resources for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Proceso recursos: sin acceso público" on public.product_process_resources;
create policy "Proceso recursos: sin acceso público"
  on public.product_process_resources for all to anon
  using (false)
  with check (false);

grant select, insert, update on public.product_process_steps to authenticated;
grant select, insert, update on public.product_process_resources to authenticated;
grant all on public.product_process_steps, public.product_process_resources to service_role;
