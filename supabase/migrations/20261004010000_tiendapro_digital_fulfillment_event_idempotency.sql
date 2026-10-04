-- Idempotencia de auditoría: un solo evento entitlements_granted por pedido.

delete from public.digital_fulfillment_events a
using public.digital_fulfillment_events b
where a.order_id = b.order_id
  and a.event_type = 'entitlements_granted'
  and b.event_type = 'entitlements_granted'
  and a.created_at > b.created_at;

create unique index if not exists digital_fulfillment_events_entitlements_granted_once_idx
  on public.digital_fulfillment_events (order_id)
  where event_type = 'entitlements_granted';

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
  v_event_inserted boolean := false;
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
  )
  on conflict (order_id) where event_type = 'entitlements_granted' do nothing;

  get diagnostics v_row_count = row_count;
  v_event_inserted := v_row_count > 0;

  return jsonb_build_object(
    'ok', true,
    'entitlementsCreated', v_created,
    'entitlementsActivated', v_activated,
    'fulfillmentEventInserted', v_event_inserted
  );
end;
$$;
