-- Gate 3H — Mercado Pago Checkout Pro (Orders API) + webhook + fulfillment idempotente

alter table public.orders
  add column if not exists payment_provider text,
  add column if not exists mp_order_id text,
  add column if not exists mp_idempotency_key text,
  add column if not exists mp_status text,
  add column if not exists mp_status_detail text,
  add column if not exists mp_last_event_at timestamptz,
  add column if not exists mp_fulfilled_at timestamptz;

create unique index if not exists orders_mp_order_id_uidx
  on public.orders (mp_order_id)
  where mp_order_id is not null;

create unique index if not exists orders_mp_idempotency_key_uidx
  on public.orders (mp_idempotency_key)
  where mp_idempotency_key is not null;

create table if not exists public.mercadopago_webhook_events (
  id uuid primary key default gen_random_uuid(),
  x_request_id text not null,
  mp_order_id text,
  notification_type text,
  action text,
  outcome text,
  received_at timestamptz not null default now(),
  processed_at timestamptz not null default now()
);

create unique index if not exists mercadopago_webhook_events_request_uidx
  on public.mercadopago_webhook_events (x_request_id);

comment on table public.mercadopago_webhook_events is
  'Anti-replay de webhooks MP (Order). Sin secretos. Solo service_role.';

alter table public.mercadopago_webhook_events enable row level security;

revoke all on table public.mercadopago_webhook_events from public, anon, authenticated;
grant select, insert, update on table public.mercadopago_webhook_events to service_role;

create or replace function public.apply_mercadopago_order_payment(
  p_order_id uuid,
  p_mp_order_id text,
  p_mp_status text,
  p_mp_status_detail text,
  p_amount numeric,
  p_currency text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_already_paid boolean := false;
begin
  perform pg_advisory_xact_lock(hashtext('mp_order_pay:' || p_order_id::text));

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'order_not_found');
  end if;

  if v_order.status = 'paid' then
    v_already_paid := true;
  end if;

  if p_mp_status is distinct from 'processed' or p_mp_status_detail is distinct from 'accredited' then
    update public.orders
    set
      mp_order_id = coalesce(mp_order_id, nullif(trim(p_mp_order_id), '')),
      mp_status = p_mp_status,
      mp_status_detail = p_mp_status_detail,
      mp_last_event_at = now(),
      updated_at = now()
    where id = p_order_id;
    return jsonb_build_object('ok', false, 'reason', 'not_accredited', 'already_paid', v_already_paid);
  end if;

  if upper(trim(coalesce(p_currency, ''))) <> upper(trim(v_order.currency)) then
    return jsonb_build_object('ok', false, 'reason', 'currency_mismatch');
  end if;

  if round(p_amount::numeric, 2) <> round(v_order.total::numeric, 2) then
    return jsonb_build_object('ok', false, 'reason', 'amount_mismatch');
  end if;

  if v_already_paid then
    return jsonb_build_object('ok', true, 'reason', 'already_paid', 'idempotent', true);
  end if;

  update public.orders
  set
    status = 'paid',
    payment_provider = 'mercadopago',
    mp_order_id = nullif(trim(p_mp_order_id), ''),
    mp_status = p_mp_status,
    mp_status_detail = p_mp_status_detail,
    mp_last_event_at = now(),
    mp_fulfilled_at = coalesce(mp_fulfilled_at, now()),
    updated_at = now()
  where id = p_order_id;

  return jsonb_build_object('ok', true, 'reason', 'paid', 'idempotent', false);
end;
$$;

revoke all on function public.apply_mercadopago_order_payment(uuid, text, text, text, numeric, text) from public;
grant execute on function public.apply_mercadopago_order_payment(uuid, text, text, text, numeric, text) to service_role;

create or replace function public.get_order_payment_status_safe(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
begin
  if auth.uid() is null then
    return jsonb_build_object('found', false, 'reason', 'unauthenticated');
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id and user_id = auth.uid();

  if not found then
    return jsonb_build_object('found', false, 'reason', 'not_found');
  end if;

  return jsonb_build_object(
    'found', true,
    'order_id', v_order.id,
    'status', v_order.status,
    'payment_provider', v_order.payment_provider,
    'mp_status', v_order.mp_status,
    'mp_status_detail', v_order.mp_status_detail,
    'total', v_order.total,
    'currency', v_order.currency,
    'mp_fulfilled_at', v_order.mp_fulfilled_at
  );
end;
$$;

revoke all on function public.get_order_payment_status_safe(uuid) from public;
grant execute on function public.get_order_payment_status_safe(uuid) to authenticated;

notify pgrst, 'reload schema';
