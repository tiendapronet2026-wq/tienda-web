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
