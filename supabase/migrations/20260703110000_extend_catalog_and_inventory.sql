-- =============================================================================
-- Fases 6-7-9: Extender categorías, productos, carrito e inventario
-- =============================================================================

-- Categorías: nuevos campos (compatibles con registros existentes)
alter table public.categories
  add column if not exists description text,
  add column if not exists image_url text,
  add column if not exists is_active boolean not null default true,
  add column if not exists sort_order integer not null default 0,
  add column if not exists updated_at timestamptz not null default now();

update public.categories set is_active = true where is_active is null;

drop trigger if exists categories_updated_at on public.categories;
create trigger categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- Productos: renombrar active -> is_active y agregar campos
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'active'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'is_active'
  ) then
    alter table public.products rename column active to is_active;
  end if;
end $$;

alter table public.products
  add column if not exists is_active boolean not null default true,
  add column if not exists short_description text,
  add column if not exists sku text,
  add column if not exists compare_at_price numeric(10, 2) check (compare_at_price is null or compare_at_price >= 0),
  add column if not exists cost_price numeric(10, 2) check (cost_price is null or cost_price >= 0),
  add column if not exists low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  add column if not exists track_stock boolean not null default true,
  add column if not exists is_featured boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

-- SKU único para productos que lo tengan
create unique index if not exists products_sku_unique_idx
  on public.products(sku) where sku is not null;

create index if not exists products_is_featured_idx on public.products(is_featured);
create index if not exists products_is_active_idx on public.products(is_active);

drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- Carrito: asociación con usuario autenticado
alter table public.cart_items
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists cart_items_user_id_idx on public.cart_items(user_id);

-- Inventario
create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  movement_type text not null check (movement_type in (
    'initial', 'manual_in', 'manual_out', 'adjustment', 'sale', 'sale_cancelled'
  )),
  quantity integer not null check (quantity > 0),
  previous_stock integer not null check (previous_stock >= 0),
  new_stock integer not null check (new_stock >= 0),
  reason text,
  reference_type text,
  reference_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists inventory_movements_product_id_idx
  on public.inventory_movements(product_id);

alter table public.inventory_movements enable row level security;

-- Función segura para ajuste manual de stock (solo admin)
create or replace function public.adjust_product_stock(
  p_product_id uuid,
  p_movement_type text,
  p_quantity integer,
  p_reason text default null
)
returns public.inventory_movements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products%rowtype;
  v_delta integer;
  v_new_stock integer;
  v_movement public.inventory_movements%rowtype;
begin
  if not public.is_admin() then
    raise exception 'No autorizado';
  end if;

  if p_movement_type not in ('manual_in', 'manual_out', 'adjustment', 'initial') then
    raise exception 'Tipo de movimiento no permitido';
  end if;

  if p_quantity <= 0 then
    raise exception 'La cantidad debe ser mayor a cero';
  end if;

  select * into v_product from public.products where id = p_product_id for update;
  if not found then
    raise exception 'Producto no encontrado';
  end if;

  if not v_product.track_stock then
    raise exception 'Este producto no tiene seguimiento de stock';
  end if;

  if p_movement_type = 'manual_in' or p_movement_type = 'initial' then
    v_delta := p_quantity;
  elsif p_movement_type = 'manual_out' then
    v_delta := -p_quantity;
  else
    v_delta := p_quantity;
  end if;

  v_new_stock := v_product.stock + v_delta;
  if v_new_stock < 0 then
    raise exception 'El stock no puede ser negativo';
  end if;

  update public.products set stock = v_new_stock where id = p_product_id;

  insert into public.inventory_movements (
    product_id, movement_type, quantity,
    previous_stock, new_stock, reason, created_by
  ) values (
    p_product_id, p_movement_type, abs(p_quantity),
    v_product.stock, v_new_stock, p_reason, auth.uid()
  ) returning * into v_movement;

  return v_movement;
end;
$$;

revoke all on function public.adjust_product_stock(uuid, text, integer, text) from public;
grant execute on function public.adjust_product_stock(uuid, text, integer, text) to authenticated;
