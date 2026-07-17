-- =============================================================================
-- Costos y producción: proveedores, materiales, máquinas y mano de obra
-- Migración aditiva: no elimina ni modifica tablas/columnas existentes.
-- No afecta productos, inventario comercial, cotizaciones, pedidos o usuarios.
-- =============================================================================

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 160),
  legal_name text,
  tax_id text,
  contact_name text,
  email text check (email is null or email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  phone text,
  whatsapp text,
  website text,
  address text,
  city text,
  province text,
  country text not null default 'Argentina',
  notes text,
  payment_terms text,
  lead_time_days integer check (lead_time_days is null or lead_time_days >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.material_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.material_categories (name, slug)
values
  ('Papeles', 'papeles'),
  ('Cartulinas', 'cartulinas'),
  ('Filamentos', 'filamentos'),
  ('Materiales para láser', 'materiales-laser'),
  ('Polifan', 'polifan'),
  ('Adhesivos', 'adhesivos'),
  ('Pinturas y terminaciones', 'pinturas-terminaciones'),
  ('Embalajes', 'embalajes'),
  ('Repuestos', 'repuestos'),
  ('Otros', 'otros')
on conflict (slug) do nothing;

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.material_categories(id) on delete set null,
  name text not null check (char_length(trim(name)) between 2 and 180),
  sku text unique,
  description text,
  unit_type text not null check (unit_type in (
    'unidad', 'hoja', 'resma', 'kilogramo', 'gramo', 'metro', 'centimetro',
    'metro_cuadrado', 'centimetro_cuadrado', 'litro', 'mililitro', 'plancha',
    'rollo', 'caja', 'paquete', 'hora', 'minuto', 'otro'
  )),
  current_cost numeric(14,4) not null default 0 check (current_cost >= 0),
  currency text not null default 'ARS' check (char_length(currency) = 3),
  waste_percentage numeric(6,2) not null default 0 check (waste_percentage between 0 and 100),
  suggested_margin_percentage numeric(6,2) not null default 0 check (suggested_margin_percentage >= 0),
  minimum_stock numeric(14,4) check (minimum_stock is null or minimum_stock >= 0),
  current_stock numeric(14,4) check (current_stock is null or current_stock >= 0),
  stock_tracking_enabled boolean not null default false,
  preferred_supplier_id uuid references public.suppliers(id) on delete set null,
  last_cost_update timestamptz,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.supplier_materials (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  material_id uuid not null references public.materials(id) on delete cascade,
  supplier_sku text,
  purchase_unit text,
  unit_conversion_factor numeric(14,6) not null default 1 check (unit_conversion_factor > 0),
  latest_purchase_price numeric(14,4) check (latest_purchase_price is null or latest_purchase_price >= 0),
  currency text not null default 'ARS' check (char_length(currency) = 3),
  minimum_order_quantity numeric(14,4) check (minimum_order_quantity is null or minimum_order_quantity >= 0),
  lead_time_days integer check (lead_time_days is null or lead_time_days >= 0),
  is_preferred boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (supplier_id, material_id)
);

create unique index if not exists supplier_materials_one_preferred_idx
  on public.supplier_materials(material_id)
  where is_preferred;

create table if not exists public.material_cost_history (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materials(id) on delete restrict,
  supplier_id uuid references public.suppliers(id) on delete set null,
  previous_cost numeric(14,4) check (previous_cost is null or previous_cost >= 0),
  new_cost numeric(14,4) not null check (new_cost >= 0),
  currency text not null default 'ARS' check (char_length(currency) = 3),
  quantity_purchased numeric(14,4) check (quantity_purchased is null or quantity_purchased > 0),
  purchase_unit text,
  reference text,
  notes text,
  effective_date date not null default current_date,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create table if not exists public.machines (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 180),
  machine_type text not null check (machine_type in (
    'printer_paper', 'printer_3d', 'laser_engraver', 'polifan_cutter',
    'computer', 'finishing_tool', 'other'
  )),
  brand text,
  model text,
  serial_number text,
  purchase_date date,
  purchase_price numeric(14,2) check (purchase_price is null or purchase_price >= 0),
  estimated_useful_life_hours numeric(14,2) check (estimated_useful_life_hours is null or estimated_useful_life_hours > 0),
  accumulated_usage_hours numeric(14,2) not null default 0 check (accumulated_usage_hours >= 0),
  power_watts numeric(12,2) check (power_watts is null or power_watts >= 0),
  maintenance_cost_per_hour numeric(14,4) not null default 0 check (maintenance_cost_per_hour >= 0),
  depreciation_cost_per_hour numeric(14,4) not null default 0 check (depreciation_cost_per_hour >= 0),
  energy_cost_per_hour numeric(14,4) not null default 0 check (energy_cost_per_hour >= 0),
  additional_cost_per_hour numeric(14,4) not null default 0 check (additional_cost_per_hour >= 0),
  total_cost_per_hour numeric(14,4) not null default 0 check (total_cost_per_hour >= 0),
  setup_minutes_default integer not null default 0 check (setup_minutes_default >= 0),
  cost_updated_at timestamptz,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.labor_rates (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 160),
  description text,
  cost_per_hour numeric(14,4) not null check (cost_per_hour >= 0),
  suggested_sale_rate_per_hour numeric(14,4) check (suggested_sale_rate_per_hour is null or suggested_sale_rate_per_hour >= 0),
  currency text not null default 'ARS' check (char_length(currency) = 3),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.business_cost_settings (
  id uuid primary key default gen_random_uuid(),
  electricity_price_per_kwh numeric(14,4) not null default 0 check (electricity_price_per_kwh >= 0),
  default_profit_margin_percentage numeric(6,2) not null default 0 check (default_profit_margin_percentage >= 0),
  default_waste_percentage numeric(6,2) not null default 0 check (default_waste_percentage between 0 and 100),
  tax_percentage numeric(6,2) not null default 0 check (tax_percentage between 0 and 100),
  fixed_overhead_percentage numeric(6,2) not null default 0 check (fixed_overhead_percentage >= 0),
  currency text not null default 'ARS' check (char_length(currency) = 3),
  cost_stale_days integer not null default 30 check (cost_stale_days > 0),
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create unique index if not exists business_cost_settings_single_active_idx
  on public.business_cost_settings(is_active)
  where is_active;

insert into public.business_cost_settings (is_active)
select true
where not exists (select 1 from public.business_cost_settings where is_active);

create table if not exists public.cost_audit_log (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  old_values jsonb,
  new_values jsonb,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Índices
create index if not exists suppliers_active_idx on public.suppliers(is_active);
create index if not exists suppliers_name_idx on public.suppliers(name);
create index if not exists materials_category_idx on public.materials(category_id);
create index if not exists materials_supplier_idx on public.materials(preferred_supplier_id);
create index if not exists materials_active_idx on public.materials(is_active);
create index if not exists materials_last_cost_idx on public.materials(last_cost_update);
create index if not exists supplier_materials_supplier_idx on public.supplier_materials(supplier_id);
create index if not exists supplier_materials_material_idx on public.supplier_materials(material_id);
create index if not exists material_cost_history_material_date_idx on public.material_cost_history(material_id, effective_date desc, created_at desc);
create index if not exists machines_active_idx on public.machines(is_active);
create index if not exists labor_rates_active_idx on public.labor_rates(is_active);
create index if not exists cost_audit_entity_idx on public.cost_audit_log(entity_type, entity_id, created_at desc);

-- updated_at
drop trigger if exists suppliers_updated_at on public.suppliers;
create trigger suppliers_updated_at before update on public.suppliers
for each row execute function public.set_updated_at();
drop trigger if exists material_categories_updated_at on public.material_categories;
create trigger material_categories_updated_at before update on public.material_categories
for each row execute function public.set_updated_at();
drop trigger if exists materials_updated_at on public.materials;
create trigger materials_updated_at before update on public.materials
for each row execute function public.set_updated_at();
drop trigger if exists supplier_materials_updated_at on public.supplier_materials;
create trigger supplier_materials_updated_at before update on public.supplier_materials
for each row execute function public.set_updated_at();
drop trigger if exists machines_updated_at on public.machines;
create trigger machines_updated_at before update on public.machines
for each row execute function public.set_updated_at();
drop trigger if exists labor_rates_updated_at on public.labor_rates;
create trigger labor_rates_updated_at before update on public.labor_rates
for each row execute function public.set_updated_at();
drop trigger if exists business_cost_settings_updated_at on public.business_cost_settings;
create trigger business_cost_settings_updated_at before update on public.business_cost_settings
for each row execute function public.set_updated_at();

-- Total de máquina siempre consistente con el desglose.
create or replace function public.set_machine_total_cost()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.total_cost_per_hour :=
    coalesce(new.energy_cost_per_hour, 0)
    + coalesce(new.maintenance_cost_per_hour, 0)
    + coalesce(new.depreciation_cost_per_hour, 0)
    + coalesce(new.additional_cost_per_hour, 0);
  if new.total_cost_per_hour is distinct from old.total_cost_per_hour
     or new.energy_cost_per_hour is distinct from old.energy_cost_per_hour
     or new.maintenance_cost_per_hour is distinct from old.maintenance_cost_per_hour
     or new.depreciation_cost_per_hour is distinct from old.depreciation_cost_per_hour
     or new.additional_cost_per_hour is distinct from old.additional_cost_per_hour then
    new.cost_updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists machines_total_cost on public.machines;
create trigger machines_total_cost
before insert or update on public.machines
for each row execute function public.set_machine_total_cost();

-- Cambio transaccional de costo + historial + proveedor + auditoría.
create or replace function public.update_material_cost(
  p_material_id uuid,
  p_new_cost numeric,
  p_supplier_id uuid default null,
  p_currency text default 'ARS',
  p_quantity_purchased numeric default null,
  p_purchase_unit text default null,
  p_reference text default null,
  p_notes text default null,
  p_effective_date date default current_date
)
returns public.materials
language plpgsql
security definer
set search_path = public
as $$
declare
  v_material public.materials;
  v_old_cost numeric;
begin
  if not public.is_admin() then
    raise exception 'Acceso denegado';
  end if;
  if p_new_cost is null or p_new_cost < 0 then
    raise exception 'Costo inválido';
  end if;

  select * into v_material from public.materials
  where id = p_material_id for update;
  if not found then raise exception 'Material no encontrado'; end if;
  v_old_cost := v_material.current_cost;

  insert into public.material_cost_history (
    material_id, supplier_id, previous_cost, new_cost, currency,
    quantity_purchased, purchase_unit, reference, notes, effective_date, created_by
  ) values (
    p_material_id, p_supplier_id, v_old_cost, p_new_cost, upper(p_currency),
    p_quantity_purchased, p_purchase_unit, p_reference, p_notes,
    coalesce(p_effective_date, current_date), auth.uid()
  );

  update public.materials
  set current_cost = p_new_cost,
      currency = upper(p_currency),
      last_cost_update = now(),
      preferred_supplier_id = coalesce(p_supplier_id, preferred_supplier_id),
      updated_by = auth.uid()
  where id = p_material_id
  returning * into v_material;

  if p_supplier_id is not null then
    update public.supplier_materials set is_preferred = false
    where material_id = p_material_id and supplier_id <> p_supplier_id;

    insert into public.supplier_materials (
      supplier_id, material_id, latest_purchase_price, currency, purchase_unit, is_preferred
    ) values (
      p_supplier_id, p_material_id, p_new_cost, upper(p_currency), p_purchase_unit, true
    )
    on conflict (supplier_id, material_id) do update
    set latest_purchase_price = excluded.latest_purchase_price,
        currency = excluded.currency,
        purchase_unit = coalesce(excluded.purchase_unit, public.supplier_materials.purchase_unit),
        is_preferred = true,
        updated_at = now();
  end if;

  insert into public.cost_audit_log (
    entity_type, entity_id, action, old_values, new_values, user_id
  ) values (
    'material', p_material_id, 'cost_updated',
    jsonb_build_object('current_cost', v_old_cost),
    jsonb_build_object('current_cost', p_new_cost, 'currency', upper(p_currency), 'supplier_id', p_supplier_id),
    auth.uid()
  );

  return v_material;
end;
$$;

revoke all on function public.update_material_cost(uuid,numeric,uuid,text,numeric,text,text,text,date) from public;
grant execute on function public.update_material_cost(uuid,numeric,uuid,text,numeric,text,text,text,date) to authenticated;

-- RLS: todas las entidades son estrictamente administrativas.
alter table public.suppliers enable row level security;
alter table public.material_categories enable row level security;
alter table public.materials enable row level security;
alter table public.supplier_materials enable row level security;
alter table public.material_cost_history enable row level security;
alter table public.machines enable row level security;
alter table public.labor_rates enable row level security;
alter table public.business_cost_settings enable row level security;
alter table public.cost_audit_log enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'suppliers','material_categories','materials','supplier_materials',
    'material_cost_history','machines','labor_rates','business_cost_settings','cost_audit_log'
  ] loop
    execute format('drop policy if exists "Costos: solo admin" on public.%I', t);
    execute format(
      'create policy "Costos: solo admin" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      t
    );
    execute format('drop policy if exists "Costos: sin acceso público" on public.%I', t);
    execute format(
      'create policy "Costos: sin acceso público" on public.%I for all to anon using (false) with check (false)',
      t
    );
  end loop;
end $$;

-- Grants explícitos. current_cost solo cambia mediante RPC.
grant select, insert, update on public.suppliers to authenticated;
grant select, insert, update on public.material_categories to authenticated;
grant select, insert on public.materials to authenticated;
grant update (
  category_id, name, sku, description, unit_type, currency, waste_percentage,
  suggested_margin_percentage, minimum_stock, current_stock, stock_tracking_enabled,
  preferred_supplier_id, is_active, notes, updated_by
) on public.materials to authenticated;
grant select, insert, update on public.supplier_materials to authenticated;
grant select, insert on public.material_cost_history to authenticated;
grant select, insert, update on public.machines to authenticated;
grant select, insert, update on public.labor_rates to authenticated;
grant select, update on public.business_cost_settings to authenticated;
grant select, insert on public.cost_audit_log to authenticated;

grant all on public.suppliers, public.material_categories, public.materials,
  public.supplier_materials, public.material_cost_history, public.machines,
  public.labor_rates, public.business_cost_settings, public.cost_audit_log
to service_role;
