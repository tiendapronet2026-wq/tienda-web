-- Launch Track L1 — producto digital, recursos de entrega y entitlements (Casa León / M&M no afectados)

alter table public.products
  add column if not exists fulfillment_type text not null default 'physical'
  check (fulfillment_type in ('physical', 'digital'));

comment on column public.products.fulfillment_type is
  'physical = envío físico; digital = entrega por entitlement tras pago aprobado.';

create table if not exists public.digital_delivery_resources (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  provider text not null default 'google_drive'
    check (provider in ('google_drive')),
  external_resource_id text not null,
  label text not null default 'Contenido principal',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint digital_delivery_resources_product_provider_label_key
    unique (product_id, provider, label)
);

create index if not exists digital_delivery_resources_product_active_idx
  on public.digital_delivery_resources (product_id)
  where active;

create table if not exists public.digital_entitlements (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  order_item_id uuid references public.order_items(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'revoked')),
  granted_at timestamptz,
  revoked_at timestamptz,
  claim_token_hash text,
  claim_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint digital_entitlements_order_product_key unique (order_id, product_id)
);

create unique index if not exists digital_entitlements_order_item_id_key
  on public.digital_entitlements (order_item_id)
  where order_item_id is not null;

create table if not exists public.digital_fulfillment_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists digital_fulfillment_events_order_idx
  on public.digital_fulfillment_events (order_id, created_at desc);

alter table public.digital_fulfillment_events enable row level security;

create policy "Fulfillment audit solo admin"
  on public.digital_fulfillment_events for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant all on table public.digital_fulfillment_events to service_role;

create index if not exists digital_entitlements_user_status_idx
  on public.digital_entitlements (user_id, status);

drop trigger if exists digital_delivery_resources_updated_at on public.digital_delivery_resources;
create trigger digital_delivery_resources_updated_at
  before update on public.digital_delivery_resources
  for each row execute function public.set_updated_at();

drop trigger if exists digital_entitlements_updated_at on public.digital_entitlements;
create trigger digital_entitlements_updated_at
  before update on public.digital_entitlements
  for each row execute function public.set_updated_at();

alter table public.digital_delivery_resources enable row level security;
alter table public.digital_entitlements enable row level security;

revoke all on table public.digital_delivery_resources from anon;
revoke all on table public.digital_entitlements from anon;

create policy "Entitlements propios lectura"
  on public.digital_entitlements for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "Entitlements admin escritura"
  on public.digital_entitlements for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Recursos digitales solo admin"
  on public.digital_delivery_resources for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on table public.digital_entitlements to authenticated;
grant all on table public.digital_entitlements to service_role;
grant all on table public.digital_delivery_resources to service_role;

-- Catálogo pack (precio editable desde admin; sin stock)
insert into public.categories (name, slug, description, is_active, sort_order)
values (
  'Cursos digitales',
  'cursos-digitales',
  'Formación y packs descargables',
  true,
  90
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  is_active = true;

insert into public.products (
  category_id,
  name,
  slug,
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
  'PACK +150 CURSOS DIGITALES + BONOS',
  'pack-150-cursos-digitales-bonos',
  'Acceso digital a más de 150 cursos y bonos para estudiar y revender con derechos del comprador.',
  'Pack digital con formación variada (marketing, diseño, oficios, idiomas, tecnología y más) más bonos de material comercial. Entrega online tras confirmar el pago.',
  29999.00,
  0,
  false,
  false,
  false,
  'digital'
from public.categories c
where c.slug = 'cursos-digitales'
on conflict (slug) do update set
  name = excluded.name,
  short_description = excluded.short_description,
  description = excluded.description,
  track_stock = false,
  fulfillment_type = 'digital',
  category_id = excluded.category_id;

comment on table public.digital_fulfillment_events is
  'Auditoría server-side de entrega digital (sin secretos de Drive).';

-- Entitlements idempotentes tras pago aprobado (L2)
create or replace function public.grant_digital_entitlements_for_paid_order(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_line record;
  v_created int := 0;
  v_activated int := 0;
  v_row_count int;
  v_now timestamptz := now();
  v_email text;
begin
  perform pg_advisory_xact_lock(hashtext('digital_entitlement:' || p_order_id::text));

  select * into v_order from public.orders where id = p_order_id;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'order_not_found');
  end if;

  if v_order.status is distinct from 'paid' then
    return jsonb_build_object('ok', false, 'reason', 'order_not_approved');
  end if;

  select u.email into v_email
  from auth.users u
  where u.id = v_order.user_id;

  for v_line in
    select oi.id as order_item_id, oi.product_id, p.fulfillment_type
    from public.order_items oi
    join public.products p on p.id = oi.product_id
    where oi.order_id = p_order_id
      and oi.product_id is not null
      and p.fulfillment_type = 'digital'
  loop
    insert into public.digital_entitlements (
      order_id,
      order_item_id,
      product_id,
      user_id,
      email,
      status,
      granted_at
    )
    values (
      p_order_id,
      v_line.order_item_id,
      v_line.product_id,
      v_order.user_id,
      v_email,
      'active',
      v_now
    )
    on conflict (order_id, product_id) do update
      set
        order_item_id = coalesce(public.digital_entitlements.order_item_id, excluded.order_item_id),
        status = case
          when public.digital_entitlements.status = 'revoked' then public.digital_entitlements.status
          else 'active'
        end,
        granted_at = coalesce(public.digital_entitlements.granted_at, excluded.granted_at),
        updated_at = v_now;

    get diagnostics v_row_count = row_count;
    if v_row_count > 0 then
      v_created := v_created + 1;
      if exists (
        select 1 from public.digital_entitlements
        where order_id = p_order_id
          and product_id = v_line.product_id
          and status = 'active'
      ) then
        v_activated := v_activated + 1;
      end if;
    end if;
  end loop;

  insert into public.digital_fulfillment_events (order_id, event_type, payload)
  values (
    p_order_id,
    'entitlements_granted',
    jsonb_build_object(
      'created_or_updated', v_created,
      'activated', v_activated
    )
  );

  return jsonb_build_object(
    'ok', true,
    'entitlementsCreated', v_created,
    'entitlementsActivated', v_activated
  );
end;
$$;

revoke all on function public.grant_digital_entitlements_for_paid_order(uuid) from public;
grant execute on function public.grant_digital_entitlements_for_paid_order(uuid) to service_role;
