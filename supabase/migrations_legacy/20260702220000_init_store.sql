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
