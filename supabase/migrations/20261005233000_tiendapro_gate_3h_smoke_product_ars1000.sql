-- Gate 3H — producto digital exclusivo smoke MP ARS 1.000 (no altera Pack comercial)

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
  'SMOKE MP — Pack 150',
  'smoke-mp-pack-150',
  'SMOKE-MP-PACK-150',
  '[SMOKE][MP] Producto de prueba monetaria Gate 3H. No listado. No usar en ventas.',
  'Smoke E2E Mercado Pago → webhook → entitlement → Mis compras → Drive. Entrega temporalmente alias al mismo folder Drive del Pack comercial; retirar este producto y su fila en digital_delivery_resources tras validación.',
  1000.00,
  0,
  false,
  false,
  false,
  'digital'
from public.categories c
where c.slug = 'cursos-digitales'
on conflict (slug) do update set
  name = excluded.name,
  sku = excluded.sku,
  short_description = excluded.short_description,
  description = excluded.description,
  price = 1000.00,
  track_stock = false,
  is_active = false,
  is_featured = false,
  fulfillment_type = 'digital',
  category_id = excluded.category_id,
  updated_at = now();

-- Alias de entrega: mismo external_resource_id que Pack 150 (sin duplicar Drive)
insert into public.digital_delivery_resources (
  product_id,
  provider,
  external_resource_id,
  label,
  active
)
select
  smoke.id,
  'google_drive',
  pack_res.external_resource_id,
  'Smoke MP alias → Pack 150 Drive (retirar post-smoke)',
  true
from public.products smoke
cross join lateral (
  select d.external_resource_id
  from public.products p
  join public.digital_delivery_resources d
    on d.product_id = p.id and d.active = true and d.provider = 'google_drive'
  where p.slug = 'pack-150-cursos-digitales-bonos'
  order by d.created_at asc
  limit 1
) pack_res
where smoke.slug = 'smoke-mp-pack-150'
on conflict (product_id, provider, label) do update set
  external_resource_id = excluded.external_resource_id,
  active = true,
  updated_at = now();

comment on table public.digital_delivery_resources is
  'Recursos de entrega digital por producto. Smoke MP usa alias explícito al Drive del Pack 150.';
