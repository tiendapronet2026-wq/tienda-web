-- Gate 3E — Precios reales por canal (sin modificar products.price)

create table if not exists public.product_channel_prices (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  channel_cost_profile_id uuid not null references public.channel_cost_profiles(id) on delete restrict,
  final_price numeric(14, 2) not null check (final_price >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_channel_prices_product_profile_key unique (product_id, channel_cost_profile_id)
);

comment on table public.product_channel_prices is
  'Precio final por producto y perfil de canal. Si is_active=false o no hay fila, checkout futuro usará products.price (fallback).';

create table if not exists public.product_channel_price_history (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  channel_cost_profile_id uuid not null references public.channel_cost_profiles(id) on delete restrict,
  previous_price numeric(14, 2) not null check (previous_price >= 0),
  adopted_price numeric(14, 2) not null check (adopted_price >= 0),
  production_cost numeric(14, 4) not null check (production_cost >= 0),
  target_channel_margin numeric(10, 6),
  resulting_channel_margin numeric(10, 6),
  channel_cost_per_unit numeric(14, 4) not null default 0,
  unit_contribution numeric(14, 4),
  tax_rate_percent numeric(6, 2) not null default 0,
  units_per_order numeric(10, 4) not null default 1 check (units_per_order > 0),
  suggested_required_price numeric(14, 2),
  reason text,
  idempotency_key text check (idempotency_key is null or char_length(trim(idempotency_key)) between 1 and 120),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists product_channel_price_history_idempotency_idx
  on public.product_channel_price_history (product_id, channel_cost_profile_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists product_channel_price_history_product_idx
  on public.product_channel_price_history (product_id, channel_cost_profile_id, created_at desc);

comment on table public.product_channel_price_history is
  'Adopción auditada de precio por canal. Append-only. No modifica products.price.';

create or replace function public.effective_channel_final_price(
  p_product_id uuid,
  p_profile_id uuid
)
returns numeric
language sql
stable
as $$
  select coalesce(
    (
      select pcp.final_price
      from public.product_channel_prices pcp
      where pcp.product_id = p_product_id
        and pcp.channel_cost_profile_id = p_profile_id
        and pcp.is_active = true
    ),
    (select p.price from public.products p where p.id = p_product_id)
  );
$$;

create or replace function public.adopt_product_channel_price(
  p_product_id uuid,
  p_profile_id uuid,
  p_adopted_price numeric default null,
  p_reason text default null,
  p_idempotency_key text default null,
  p_units_per_order numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing record;
  v_catalog numeric;
  v_prev_effective numeric;
  v_target jsonb;
  v_suggested numeric;
  v_adopted numeric;
  v_fwd jsonb;
  v_margin_target numeric;
  v_uid uuid;
  v_history_id uuid;
  v_row_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Acceso denegado';
  end if;

  v_uid := auth.uid();

  if p_idempotency_key is not null and char_length(trim(p_idempotency_key)) > 0 then
    select *
    into v_existing
    from public.product_channel_price_history h
    where h.product_id = p_product_id
      and h.channel_cost_profile_id = p_profile_id
      and h.idempotency_key = trim(p_idempotency_key)
    limit 1;

    if found then
      return jsonb_build_object(
        'idempotent_replay', true,
        'history_id', v_existing.id,
        'adopted_price', v_existing.adopted_price,
        'catalog_price', (select price from products where id = p_product_id)
      );
    end if;
  end if;

  select price into v_catalog from public.products where id = p_product_id for update;
  if not found then
    raise exception 'Producto no encontrado';
  end if;

  if not exists (select 1 from public.channel_cost_profiles where id = p_profile_id) then
    raise exception 'Perfil no encontrado';
  end if;

  v_prev_effective := public.effective_channel_final_price(p_product_id, p_profile_id);

  v_target := public.calculate_product_channel_target_price(
    p_product_id,
    p_profile_id,
    null,
    p_units_per_order,
    null
  );

  if not (v_target->>'feasible')::boolean and p_adopted_price is null then
    raise exception 'Precio objetivo no alcanzable: %', coalesce(v_target->>'infeasible_reason', 'perfil inviable');
  end if;

  v_suggested := (v_target->>'rounded_required_final_price')::numeric;
  v_adopted := coalesce(p_adopted_price, v_suggested);
  if v_adopted is null or v_adopted < 0 then
    raise exception 'Precio adoptado inválido';
  end if;

  v_margin_target := (v_target->>'target_channel_margin')::numeric;

  v_fwd := public.calculate_product_channel_profitability(
    p_product_id,
    p_profile_id,
    round(v_adopted, 2),
    p_units_per_order
  );

  insert into public.product_channel_price_history (
    product_id,
    channel_cost_profile_id,
    previous_price,
    adopted_price,
    production_cost,
    target_channel_margin,
    resulting_channel_margin,
    channel_cost_per_unit,
    unit_contribution,
    tax_rate_percent,
    units_per_order,
    suggested_required_price,
    reason,
    idempotency_key,
    metadata,
    created_by
  )
  values (
    p_product_id,
    p_profile_id,
    coalesce(v_prev_effective, v_catalog),
    round(v_adopted, 2),
    (v_fwd->>'production_cost')::numeric,
    v_margin_target,
    (v_fwd->>'channel_margin')::numeric,
    (v_fwd->>'channel_cost_per_unit')::numeric,
    (v_fwd->>'unit_contribution')::numeric,
    (v_fwd->>'tax_rate')::numeric,
    (v_fwd->>'units_per_order')::numeric,
    v_suggested,
    nullif(trim(p_reason), ''),
    case when p_idempotency_key is not null and char_length(trim(p_idempotency_key)) > 0
      then trim(p_idempotency_key) else null end,
    jsonb_build_object('source', 'gate_3e_adopt', 'catalog_price_unchanged', v_catalog),
    v_uid
  )
  returning id into v_history_id;

  insert into public.product_channel_prices (
    product_id,
    channel_cost_profile_id,
    final_price,
    is_active,
    updated_at
  )
  values (
    p_product_id,
    p_profile_id,
    round(v_adopted, 2),
    true,
    now()
  )
  on conflict (product_id, channel_cost_profile_id) do update
  set final_price = excluded.final_price,
      is_active = true,
      updated_at = now()
  returning id into v_row_id;

  return jsonb_build_object(
    'idempotent_replay', false,
    'history_id', v_history_id,
    'channel_price_id', v_row_id,
    'catalog_price', v_catalog,
    'previous_effective_price', v_prev_effective,
    'adopted_price', round(v_adopted, 2),
    'suggested_required_price', v_suggested,
    'resulting_channel_margin', (v_fwd->>'channel_margin')::numeric,
    'unit_contribution', (v_fwd->>'unit_contribution')::numeric
  );
end;
$$;

create or replace function public.revert_product_channel_price(
  p_product_id uuid,
  p_profile_id uuid,
  p_reason text default null,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing record;
  v_catalog numeric;
  v_channel numeric;
  v_uid uuid;
  v_history_id uuid;
  v_fwd jsonb;
begin
  if not public.is_admin() then
    raise exception 'Acceso denegado';
  end if;

  v_uid := auth.uid();

  if p_idempotency_key is not null and char_length(trim(p_idempotency_key)) > 0 then
    select *
    into v_existing
    from public.product_channel_price_history h
    where h.product_id = p_product_id
      and h.channel_cost_profile_id = p_profile_id
      and h.idempotency_key = trim(p_idempotency_key)
    limit 1;

    if found then
      return jsonb_build_object('idempotent_replay', true, 'history_id', v_existing.id);
    end if;
  end if;

  select price into v_catalog from public.products where id = p_product_id for update;
  if not found then raise exception 'Producto no encontrado'; end if;

  select final_price into v_channel
  from public.product_channel_prices
  where product_id = p_product_id
    and channel_cost_profile_id = p_profile_id
    and is_active = true
  for update;

  if v_channel is null then
    return jsonb_build_object(
      'reverted', false,
      'message', 'No hay override activo',
      'catalog_price', v_catalog
    );
  end if;

  v_fwd := public.calculate_product_channel_profitability(
    p_product_id,
    p_profile_id,
    v_catalog,
    null
  );

  insert into public.product_channel_price_history (
    product_id,
    channel_cost_profile_id,
    previous_price,
    adopted_price,
    production_cost,
    target_channel_margin,
    resulting_channel_margin,
    channel_cost_per_unit,
    unit_contribution,
    tax_rate_percent,
    units_per_order,
    suggested_required_price,
    reason,
    idempotency_key,
    metadata,
    created_by
  )
  values (
    p_product_id,
    p_profile_id,
    v_channel,
    v_catalog,
    (v_fwd->>'production_cost')::numeric,
    null,
    (v_fwd->>'channel_margin')::numeric,
    (v_fwd->>'channel_cost_per_unit')::numeric,
    (v_fwd->>'unit_contribution')::numeric,
    (v_fwd->>'tax_rate')::numeric,
    (v_fwd->>'units_per_order')::numeric,
    null,
    nullif(trim(p_reason), ''),
    case when p_idempotency_key is not null and char_length(trim(p_idempotency_key)) > 0
      then trim(p_idempotency_key) else null end,
    jsonb_build_object('source', 'gate_3e_revert_to_catalog', 'catalog_price', v_catalog),
    v_uid
  )
  returning id into v_history_id;

  update public.product_channel_prices
  set is_active = false, updated_at = now()
  where product_id = p_product_id and channel_cost_profile_id = p_profile_id;

  return jsonb_build_object(
    'reverted', true,
    'history_id', v_history_id,
    'catalog_price', v_catalog,
    'previous_channel_price', v_channel
  );
end;
$$;

comment on function public.adopt_product_channel_price(uuid, uuid, numeric, text, text, numeric) is
  'Admin-only atómico: adopta precio por canal sin modificar products.price.';

revoke all on function public.effective_channel_final_price(uuid, uuid) from public;
revoke all on function public.adopt_product_channel_price(uuid, uuid, numeric, text, text, numeric) from public;
revoke all on function public.adopt_product_channel_price(uuid, uuid, numeric, text, text, numeric) from anon;
revoke all on function public.revert_product_channel_price(uuid, uuid, text, text) from public;
revoke all on function public.revert_product_channel_price(uuid, uuid, text, text) from anon;
grant execute on function public.adopt_product_channel_price(uuid, uuid, numeric, text, text, numeric) to authenticated;
grant execute on function public.revert_product_channel_price(uuid, uuid, text, text) to authenticated;

alter table public.product_channel_prices enable row level security;
alter table public.product_channel_price_history enable row level security;

drop policy if exists "Channel prices: admin" on public.product_channel_prices;
create policy "Channel prices: admin"
  on public.product_channel_prices for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Channel prices: sin anon" on public.product_channel_prices;
create policy "Channel prices: sin anon"
  on public.product_channel_prices for all to anon using (false) with check (false);

drop policy if exists "Channel price history: admin read" on public.product_channel_price_history;
create policy "Channel price history: admin read"
  on public.product_channel_price_history for select to authenticated
  using (public.is_admin());

drop policy if exists "Channel price history: sin anon" on public.product_channel_price_history;
create policy "Channel price history: sin anon"
  on public.product_channel_price_history for all to anon using (false) with check (false);

grant select, insert, update, delete on public.product_channel_prices to authenticated;
grant select on public.product_channel_price_history to authenticated;
grant all on public.product_channel_prices to service_role;
grant all on public.product_channel_price_history to service_role;
