-- Regresión: grant_digital_entitlements_for_paid_order idempotente (entitlement + evento).
\set ON_ERROR_STOP on

do $$
declare
  v_user uuid := '55555555-5555-5555-5555-555555555555'::uuid;
  v_product uuid;
  v_order uuid;
  v_ent_count int;
  v_evt_count int;
  v_rpc jsonb;
begin
  insert into auth.users (id, email, raw_user_meta_data)
  values (v_user, 'digital-grant-idem@example.invalid', '{}')
  on conflict (id) do nothing;

  insert into public.profiles (id, role, first_name, last_name)
  values (v_user, 'customer', 'Digital', 'Idem')
  on conflict (id) do update set role = 'customer';

  select id into v_product
  from public.products
  where slug = 'pack-150-cursos-digitales-bonos'
  limit 1;

  if v_product is null then
    raise exception 'FAIL: pack product missing';
  end if;

  insert into public.orders (
    user_id,
    status,
    subtotal,
    shipping_cost,
    total,
    currency,
    notes,
    checkout_idempotency_key
  )
  values (
    v_user,
    'paid',
    1,
    0,
    1,
    'ARS',
    '[DIGITAL_TEST] isolated idempotency',
    'digital-grant-idem-' || gen_random_uuid()::text
  )
  returning id into v_order;

  insert into public.order_items (
    order_id,
    product_id,
    product_name,
    product_sku,
    unit_price,
    quantity,
    line_total
  )
  select
    v_order,
    p.id,
    p.name,
    p.sku,
    1,
    1,
    1
  from public.products p
  where p.id = v_product;

  v_rpc := public.grant_digital_entitlements_for_paid_order(v_order);
  if coalesce(v_rpc->>'ok', 'false') <> 'true' then
    raise exception 'FAIL: first grant %', v_rpc;
  end if;

  select count(*) into v_ent_count
  from public.digital_entitlements
  where order_id = v_order and product_id = v_product and status = 'active';

  select count(*) into v_evt_count
  from public.digital_fulfillment_events
  where order_id = v_order and event_type = 'entitlements_granted';

  if v_ent_count <> 1 or v_evt_count <> 1 then
    raise exception 'FAIL: after first grant ent=% evt=%', v_ent_count, v_evt_count;
  end if;

  v_rpc := public.grant_digital_entitlements_for_paid_order(v_order);

  select count(*) into v_ent_count
  from public.digital_entitlements
  where order_id = v_order and product_id = v_product and status = 'active';

  select count(*) into v_evt_count
  from public.digital_fulfillment_events
  where order_id = v_order and event_type = 'entitlements_granted';

  if v_ent_count <> 1 or v_evt_count <> 1 then
    raise exception 'FAIL: after second grant ent=% evt=%', v_ent_count, v_evt_count;
  end if;

  update public.digital_entitlements set status = 'revoked', revoked_at = now() where order_id = v_order;
  update public.orders set status = 'cancelled' where id = v_order;
end $$;
