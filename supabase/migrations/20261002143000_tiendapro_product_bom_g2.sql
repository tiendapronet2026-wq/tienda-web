-- Gate 2 — BOM producto → materiales + roll-up de costo (solo materiales; máquinas/mano de obra en 2B)

create table if not exists public.product_bom_lines (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  product_variant_id uuid,
  material_id uuid not null references public.materials(id) on delete restrict,
  quantity numeric(14, 6) not null check (quantity > 0),
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

comment on column public.product_bom_lines.product_variant_id is
  'Reservado para BOM por variante; sin FK hasta existir tabla de variantes.';

create unique index if not exists product_bom_lines_product_material_idx
  on public.product_bom_lines (product_id, material_id)
  where product_variant_id is null;

create index if not exists product_bom_lines_product_idx
  on public.product_bom_lines (product_id)
  where is_active;

create index if not exists product_bom_lines_material_idx
  on public.product_bom_lines (material_id);

drop trigger if exists product_bom_lines_updated_at on public.product_bom_lines;
create trigger product_bom_lines_updated_at
  before update on public.product_bom_lines
  for each row execute function public.set_updated_at();

create or replace function public.calculate_product_material_cost(p_product_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    round(
      sum(b.quantity * m.current_cost)::numeric,
      4
    ),
    0
  )
  from public.product_bom_lines b
  inner join public.materials m on m.id = b.material_id
  where b.product_id = p_product_id
    and b.is_active
    and b.product_variant_id is null
    and m.is_active
    and m.current_cost >= 0;
$$;

comment on function public.calculate_product_material_cost(uuid) is
  'SUM(cantidad × materials.current_cost) solo para líneas BOM activas y materiales activos. Sin snapshot en BOM.';

revoke all on function public.calculate_product_material_cost(uuid) from public;
revoke all on function public.calculate_product_material_cost(uuid) from anon;
grant execute on function public.calculate_product_material_cost(uuid) to authenticated;

alter table public.product_bom_lines enable row level security;

drop policy if exists "BOM: solo admin" on public.product_bom_lines;
create policy "BOM: solo admin"
  on public.product_bom_lines for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "BOM: sin acceso público" on public.product_bom_lines;
create policy "BOM: sin acceso público"
  on public.product_bom_lines for all to anon
  using (false)
  with check (false);

grant select, insert, update on public.product_bom_lines to authenticated;
grant all on public.product_bom_lines to service_role;
