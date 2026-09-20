-- TiendaPro 3.0 — módulo tienda legacy (aditivo sobre baseline dnptsudsxrcamtxfiszh)
-- Origen: supabase/migrations_legacy/* (sin platform_saas_core duplicado)

-- Columnas opcionales en profiles (baseline ya existe)
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists document_number text;
alter table public.profiles add column if not exists avatar_url text;

-- >>> 20260702220000_init_store.sql
-- Categorías de productos
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

-- Productos
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  price numeric(10, 2) not null check (price >= 0),
  image_url text,
  stock integer not null default 0 check (stock >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists products_category_id_idx on public.products(category_id);
create index if not exists products_active_idx on public.products(active);

-- Carrito (por sesión o usuario autenticado)
create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  unique (session_id, product_id)
);

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.cart_items enable row level security;

-- Lectura pública de catálogo
create policy "Categorías visibles para todos"
  on public.categories for select
  using (true);

create policy "Productos activos visibles para todos"
  on public.products for select
  using (active = true);

-- Carrito: cada sesión solo ve lo suyo
create policy "Ver items del propio carrito"
  on public.cart_items for select
  using (true);

create policy "Agregar items al carrito"
  on public.cart_items for insert
  with check (true);

create policy "Actualizar items del carrito"
  on public.cart_items for update
  using (true);

create policy "Eliminar items del carrito"
  on public.cart_items for delete
  using (true);

-- Datos de ejemplo
insert into public.categories (name, slug) values
  ('Electrónica', 'electronica'),
  ('Hogar', 'hogar'),
  ('Accesorios', 'accesorios')
on conflict (slug) do nothing;

insert into public.products (category_id, name, slug, description, price, image_url, stock, active)
select
  c.id,
  p.name,
  p.slug,
  p.description,
  p.price,
  p.image_url,
  p.stock,
  true
from (values
  ('electronica', 'Auriculares Bluetooth', 'auriculares-bluetooth', 'Sonido envolvente con cancelación de ruido activa.', 45999.00, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80', 25),
  ('electronica', 'Smartwatch Pro', 'smartwatch-pro', 'Monitoreo de salud, GPS y notificaciones inteligentes.', 89999.00, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80', 15),
  ('hogar', 'Lámpara LED Minimal', 'lampara-led-minimal', 'Diseño moderno con luz cálida regulable.', 24999.00, 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&q=80', 40),
  ('hogar', 'Set de Tazas Cerámica', 'set-tazas-ceramica', 'Pack x4, apto microondas y lavavajillas.', 12999.00, '/products/set-tazas-ceramica.jpg', 60),
  ('accesorios', 'Mochila Urbana', 'mochila-urbana', 'Compartimento para notebook y material resistente al agua.', 34999.00, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80', 30),
  ('accesorios', 'Botella Térmica', 'botella-termica', 'Mantiene la temperatura hasta 12 horas.', 8999.00, 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&q=80', 80)
) as p(category_slug, name, slug, description, price, image_url, stock)
join public.categories c on c.slug = p.category_slug
on conflict (slug) do nothing;

-- >>> 20260703100000_profiles_and_roles.sql
-- =============================================================================
-- Fase 3: Perfiles, roles y trigger de registro
-- =============================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  phone text,
  document_number text,
  avatar_url text,
  role text not null default 'customer'
    check (role in ('customer', 'admin', 'seller')),
  status text not null default 'active'
    check (status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists profiles_status_idx on public.profiles(status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name, role, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    'customer',
    'active'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and status = 'active'
  );
$$;

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and status = 'active'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, anon;

revoke all on function public.is_active_user() from public;
grant execute on function public.is_active_user() to authenticated, anon;

alter table public.profiles enable row level security;

-- >>> 20260703110000_extend_catalog_and_inventory.sql
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

-- >>> 20260703120000_rls_policies.sql
-- =============================================================================
-- Fase 10: Políticas RLS seguras
-- =============================================================================

-- Profiles
drop policy if exists "Perfiles: lectura propia" on public.profiles;
drop policy if exists "Perfiles: actualización propia" on public.profiles;
drop policy if exists "Perfiles: admin lectura" on public.profiles;

create policy "Perfiles: lectura propia"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "Perfiles: actualización propia"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select role from public.profiles where id = auth.uid())
    and status = (select status from public.profiles where id = auth.uid())
  );

-- Categories
drop policy if exists "Categorías visibles para todos" on public.categories;

create policy "Categorías activas públicas"
  on public.categories for select
  using (is_active = true);

create policy "Categorías admin lectura"
  on public.categories for select to authenticated
  using (public.is_admin());

create policy "Categorías admin escritura"
  on public.categories for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Products
drop policy if exists "Productos activos visibles para todos" on public.products;

create policy "Productos activos públicos"
  on public.products for select
  using (is_active = true);

create policy "Productos admin lectura"
  on public.products for select to authenticated
  using (public.is_admin());

create policy "Productos admin escritura"
  on public.products for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Cart items: acceso restringido
drop policy if exists "Ver items del propio carrito" on public.cart_items;
drop policy if exists "Agregar items al carrito" on public.cart_items;
drop policy if exists "Actualizar items del carrito" on public.cart_items;
drop policy if exists "Eliminar items del carrito" on public.cart_items;

create policy "Carrito: usuario autenticado"
  on public.cart_items for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Sin acceso directo para anon (el carrito anónimo se maneja vía service role en servidor)
create policy "Carrito: sin acceso anon directo"
  on public.cart_items for all to anon
  using (false)
  with check (false);

-- Inventory
create policy "Inventario admin"
  on public.inventory_movements for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- >>> 20260703130000_storage_product_images.sql
-- =============================================================================
-- Fase 8: Storage para imágenes de productos
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Lectura pública
drop policy if exists "Imágenes públicas lectura" on storage.objects;
create policy "Imágenes públicas lectura"
  on storage.objects for select
  using (bucket_id = 'product-images');

-- Escritura solo admin
drop policy if exists "Imágenes admin escritura" on storage.objects;
create policy "Imágenes admin escritura"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "Imágenes admin actualización" on storage.objects;
create policy "Imágenes admin actualización"
  on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "Imágenes admin eliminación" on storage.objects;
create policy "Imágenes admin eliminación"
  on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

-- >>> 20260703140000_orders_preparation.sql
-- =============================================================================
-- Fase 11: Preparación para pedidos, pagos y direcciones (sin lógica de pago)
-- =============================================================================

create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Principal',
  street text not null,
  city text not null,
  state text not null,
  postal_code text not null,
  country text not null default 'AR',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_addresses_user_id_idx on public.customer_addresses(user_id);

drop trigger if exists customer_addresses_updated_at on public.customer_addresses;
create trigger customer_addresses_updated_at
  before update on public.customer_addresses
  for each row execute function public.set_updated_at();

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'pending' check (status in (
    'pending', 'awaiting_payment', 'paid', 'preparing',
    'ready', 'shipped', 'delivered', 'cancelled', 'refunded'
  )),
  subtotal numeric(12, 2) not null default 0 check (subtotal >= 0),
  shipping_cost numeric(12, 2) not null default 0 check (shipping_cost >= 0),
  total numeric(12, 2) not null default 0 check (total >= 0),
  currency text not null default 'ARS',
  shipping_address jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_user_id_idx on public.orders(user_id);
create index if not exists orders_status_idx on public.orders(status);

drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  product_sku text,
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  line_total numeric(12, 2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

create index if not exists order_items_order_id_idx on public.order_items(order_id);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null default 'mercadopago',
  external_id text,
  status text not null default 'pending' check (status in (
    'pending', 'approved', 'rejected', 'cancelled', 'refunded'
  )),
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null default 'ARS',
  raw_response jsonb,
  webhook_processed_at timestamptz,
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payments_order_id_idx on public.payments(order_id);
create index if not exists payments_external_id_idx on public.payments(external_id);

drop trigger if exists payments_updated_at on public.payments;
create trigger payments_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

alter table public.customer_addresses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;

-- Direcciones: propias
create policy "Direcciones propias"
  on public.customer_addresses for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Pedidos: propios o admin
create policy "Pedidos propios lectura"
  on public.orders for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "Pedidos admin escritura"
  on public.orders for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Items pedido propios"
  on public.order_items for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())
    )
  );

create policy "Items pedido admin"
  on public.order_items for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Pagos propios lectura"
  on public.payments for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())
    )
  );

create policy "Pagos admin"
  on public.payments for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Documentación de arquitectura futura (comentarios en BD)
comment on table public.orders is
  'Pedidos: el total se calculará en servidor al crear el pedido. Los precios se copian a order_items. Stock se descuenta al aprobar pago vía webhook idempotente.';

comment on table public.payments is
  'Pagos Mercado Pago: webhook con idempotency_key para evitar doble procesamiento. Sin lógica de pago en esta etapa.';

comment on column public.cart_items.session_id is
  'Carrito anónimo: identificado por cookie httpOnly tienda_session en servidor. Al autenticarse, fusionar items a user_id.';

-- >>> 20260703150000_admin_notes.sql
-- Promover usuario admin inicial por email (ejecutar manualmente tras registrarse)
-- UPDATE public.profiles SET role = 'admin'
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'tiendapro.net.2026@gmail.com');

comment on function public.is_admin() is 'Verifica rol admin en servidor; no confiar en el frontend.';

-- >>> 20260703160000_security_hardening.sql
-- Fusión transaccional de carrito anónimo al autenticarse
create or replace function public.merge_anonymous_cart(
  p_session_id text,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_existing_id uuid;
  v_existing_qty integer;
begin
  if p_session_id is null or p_user_id is null then
    return;
  end if;

  for v_item in
    select id, product_id, quantity
    from public.cart_items
    where session_id = p_session_id
      and user_id is null
    for update
  loop
    select id, quantity
    into v_existing_id, v_existing_qty
    from public.cart_items
    where user_id = p_user_id
      and product_id = v_item.product_id
    for update;

    if found then
      update public.cart_items
      set quantity = least(v_existing_qty + v_item.quantity, 99)
      where id = v_existing_id;

      delete from public.cart_items where id = v_item.id;
    else
      update public.cart_items
      set user_id = p_user_id
      where id = v_item.id;
    end if;
  end loop;
end;
$$;

revoke all on function public.merge_anonymous_cart(text, uuid) from public;
grant execute on function public.merge_anonymous_cart(text, uuid) to service_role;

-- Endurecer search_path en funciones sensibles
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name, role, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    'customer',
    'active'
  );
  return new;
end;
$$;

-- Impedir inserción directa de perfiles por usuarios
drop policy if exists "Perfiles: inserción restringida" on public.profiles;
create policy "Perfiles: inserción restringida"
  on public.profiles for insert to authenticated
  with check (false);

-- Usuarios suspendidos: solo lectura de su perfil, sin actualización
drop policy if exists "Perfiles: actualización propia" on public.profiles;
create policy "Perfiles: actualización propia"
  on public.profiles for update to authenticated
  using (id = auth.uid() and status = 'active')
  with check (
    id = auth.uid()
    and status = 'active'
    and role = (select p.role from public.profiles p where p.id = auth.uid())
  );

-- Límite de cantidad en carrito a nivel de base de datos
alter table public.cart_items
  drop constraint if exists cart_items_quantity_check;

alter table public.cart_items
  add constraint cart_items_quantity_check
  check (quantity > 0 and quantity <= 99);

-- >>> 20260717200000_quote_requests.sql
-- =============================================================================
-- Cotizaciones: quote_requests + quote_attachments + storage privado
-- Migración aditiva: no elimina tablas ni columnas existentes.
-- No afecta productos, pedidos, inventario ni usuarios.
-- =============================================================================

create sequence if not exists public.quote_request_number_seq;

create or replace function public.generate_quote_number()
returns text
language plpgsql
as $$
declare
  seq_val bigint;
begin
  seq_val := nextval('public.quote_request_number_seq');
  return 'TP-Q-' || to_char(timezone('utc', now()), 'YYMMDD') || '-' || lpad(seq_val::text, 4, '0');
end;
$$;

create table if not exists public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  quote_number text not null unique default public.generate_quote_number(),
  user_id uuid references auth.users(id) on delete set null,
  service_type text not null check (service_type in (
    'impresion-papel',
    'impresion-3d',
    'grabado-laser',
    'corte-polifan',
    'personalizado'
  )),
  customer_name text not null check (char_length(trim(customer_name)) between 2 and 120),
  email text not null check (char_length(trim(email)) between 5 and 254),
  phone text check (phone is null or char_length(trim(phone)) between 6 and 40),
  company_name text check (company_name is null or char_length(trim(company_name)) <= 160),
  description text not null check (char_length(trim(description)) between 10 and 5000),
  quantity integer check (quantity is null or (quantity > 0 and quantity <= 100000)),
  width_mm numeric(12, 2) check (width_mm is null or (width_mm > 0 and width_mm <= 100000)),
  height_mm numeric(12, 2) check (height_mm is null or (height_mm > 0 and height_mm <= 100000)),
  depth_mm numeric(12, 2) check (depth_mm is null or (depth_mm > 0 and depth_mm <= 100000)),
  material text check (material is null or char_length(trim(material)) <= 160),
  color text check (color is null or char_length(trim(color)) <= 120),
  deadline_date date,
  print_color_mode text check (print_color_mode is null or print_color_mode in ('color', 'bn')),
  print_sides text check (print_sides is null or print_sides in ('simple', 'doble')),
  paper_type text check (paper_type is null or char_length(trim(paper_type)) <= 120),
  finish text check (finish is null or char_length(trim(finish)) <= 160),
  detail_level text check (detail_level is null or detail_level in ('basico', 'medio', 'alto')),
  engraving_area text check (engraving_area is null or char_length(trim(engraving_area)) <= 240),
  design_text text check (design_text is null or char_length(trim(design_text)) <= 2000),
  figure_type text check (figure_type is null or char_length(trim(figure_type)) <= 160),
  status text not null default 'new' check (status in (
    'new',
    'reviewing',
    'information_requested',
    'quoted',
    'accepted',
    'rejected',
    'cancelled',
    'completed'
  )),
  internal_notes text check (internal_notes is null or char_length(internal_notes) <= 5000),
  privacy_accepted_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists quote_requests_status_idx on public.quote_requests(status);
create index if not exists quote_requests_created_at_idx on public.quote_requests(created_at desc);
create index if not exists quote_requests_user_id_idx on public.quote_requests(user_id);
create index if not exists quote_requests_email_idx on public.quote_requests(lower(email));
create index if not exists quote_requests_service_type_idx on public.quote_requests(service_type);
create index if not exists quote_requests_quote_number_idx on public.quote_requests(quote_number);

drop trigger if exists quote_requests_updated_at on public.quote_requests;
create trigger quote_requests_updated_at
  before update on public.quote_requests
  for each row execute function public.set_updated_at();

create table if not exists public.quote_attachments (
  id uuid primary key default gen_random_uuid(),
  quote_request_id uuid not null references public.quote_requests(id) on delete cascade,
  storage_path text not null,
  original_filename text not null check (char_length(trim(original_filename)) between 1 and 255),
  mime_type text not null,
  file_size integer not null check (file_size > 0 and file_size <= 15728640),
  created_at timestamptz not null default now()
);

create index if not exists quote_attachments_quote_request_id_idx
  on public.quote_attachments(quote_request_id);

alter table public.quote_requests enable row level security;
alter table public.quote_attachments enable row level security;

-- Lectura: admin todo; cliente autenticado solo las propias
drop policy if exists "Cotizaciones: lectura propia o admin" on public.quote_requests;
create policy "Cotizaciones: lectura propia o admin"
  on public.quote_requests for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Escritura/actualización solo admin (inserción pública vía service role en servidor)
drop policy if exists "Cotizaciones: admin escritura" on public.quote_requests;
create policy "Cotizaciones: admin escritura"
  on public.quote_requests for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Cotizaciones: sin acceso anon" on public.quote_requests;
create policy "Cotizaciones: sin acceso anon"
  on public.quote_requests for all to anon
  using (false)
  with check (false);

drop policy if exists "Adjuntos cotización: lectura propia o admin" on public.quote_attachments;
create policy "Adjuntos cotización: lectura propia o admin"
  on public.quote_attachments for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.quote_requests q
      where q.id = quote_request_id
        and q.user_id = auth.uid()
    )
  );

drop policy if exists "Adjuntos cotización: admin escritura" on public.quote_attachments;
create policy "Adjuntos cotización: admin escritura"
  on public.quote_attachments for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Adjuntos cotización: sin acceso anon" on public.quote_attachments;
create policy "Adjuntos cotización: sin acceso anon"
  on public.quote_attachments for all to anon
  using (false)
  with check (false);

-- Bucket privado para adjuntos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'quote-attachments',
  'quote-attachments',
  false,
  15728640,
  array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/pdf',
    'image/svg+xml',
    'model/stl',
    'application/sla',
    'model/obj',
    'text/plain',
    'application/octet-stream',
    'application/zip',
    'application/x-zip-compressed'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Sin políticas de lectura/escritura pública: acceso solo vía service role (URLs firmadas)
drop policy if exists "Adjuntos cotización storage lectura" on storage.objects;
drop policy if exists "Adjuntos cotización storage escritura" on storage.objects;
drop policy if exists "Adjuntos cotización storage actualización" on storage.objects;
drop policy if exists "Adjuntos cotización storage eliminación" on storage.objects;

revoke all on function public.generate_quote_number() from public;
grant execute on function public.generate_quote_number() to service_role;
grant usage, select on sequence public.quote_request_number_seq to service_role;

grant select on public.quote_requests to authenticated;
grant all on public.quote_requests to service_role;
grant select on public.quote_attachments to authenticated;
grant all on public.quote_attachments to service_role;

-- Admin updates via authenticated + is_admin() policies
grant update on public.quote_requests to authenticated;

-- >>> 20260718010000_cost_management.sql
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

-- Endurecer handle_new_user (compatible con baseline on conflict)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, first_name, last_name, role, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    'customer',
    'active'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
