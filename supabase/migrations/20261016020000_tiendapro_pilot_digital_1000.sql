-- Compra piloto $1.000 ARS — producto independiente (no Pack +150, no smoke MP comercial)

insert into public.categories (name, slug, description, is_active, sort_order)
values (
  'Pruebas internas Tienda Pro',
  'pruebas-tiendapro',
  'Pilotos y pruebas. No aparece en navegación comercial.',
  false,
  999
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  is_active = false;

insert into public.products (
  category_id,
  name,
  slug,
  sku,
  short_description,
  description,
  price,
  stock,
  track_stock,
  is_active,
  is_featured,
  fulfillment_type
)
select
  c.id,
  'Producto Digital de Prueba — Tienda Pro',
  'producto-digital-prueba-tienda-pro',
  'TEST-DIGITAL-1000',
  'Compra piloto de $1.000 ARS. Solo acceso por URL /piloto/digital-1000 con flag de entorno.',
  'Recurso digital de prueba para validar checkout Mercado Pago y entrega. No incluye cursos comerciales.',
  1000.00,
  0,
  false,
  true,
  false,
  'digital'
from public.categories c
where c.slug = 'pruebas-tiendapro'
on conflict (slug) do update set
  name = excluded.name,
  sku = excluded.sku,
  short_description = excluded.short_description,
  description = excluded.description,
  price = 1000.00,
  track_stock = false,
  fulfillment_type = 'digital',
  is_active = true,
  is_featured = false,
  category_id = excluded.category_id,
  updated_at = now();

-- Entrega piloto: cargar folder ID de prueba en admin (producto digital) antes de validar entrega
insert into public.digital_delivery_resources (
  product_id,
  provider,
  external_resource_id,
  label,
  active
)
select
  p.id,
  'google_drive',
  'PILOT_CONFIGURE_DRIVE_FOLDER_ID',
  'Piloto TEST-DIGITAL-1000 — verificar archivo tras pago',
  false
from public.products p
where p.slug = 'producto-digital-prueba-tienda-pro'
on conflict (product_id, provider, label) do nothing;

-- Pedidos solo vía servidor (service_role / createAdminClient), no insert directo del cliente
drop policy if exists "Pedidos propios insert" on public.orders;
drop policy if exists "Items pedido propios insert" on public.order_items;
revoke insert on public.orders from authenticated;
revoke insert on public.order_items from authenticated;

notify pgrst, 'reload schema';
