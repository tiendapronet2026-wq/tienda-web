-- Gate 3B — Adopción controlada de precios + historial append-only

create table if not exists public.product_pricing_history (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  previous_price numeric(14, 2) not null check (previous_price >= 0),
  adopted_price numeric(14, 2) not null check (adopted_price >= 0),
  production_cost numeric(14, 4) not null check (production_cost >= 0),
  materials_cost numeric(14, 4) not null check (materials_cost >= 0),
  machine_cost numeric(14, 4) not null check (machine_cost >= 0),
  labor_cost numeric(14, 4) not null check (labor_cost >= 0),
  target_margin_percent numeric(6, 2) not null check (target_margin_percent >= 0 and target_margin_percent < 100),
  actual_margin_after_adoption numeric(10, 6),
  actual_markup_after_adoption numeric(10, 6),
  tax_rate_percent numeric(6, 2) not null default 0 check (tax_rate_percent >= 0 and tax_rate_percent <= 100),
  rounding_rule text not null default 'none'
    check (rounding_rule in ('none', 'integer', 'ten', 'hundred')),
  suggested_price numeric(14, 2) not null check (suggested_price >= 0),
  adopted_net_price numeric(14, 4),
  reason text,
  idempotency_key text check (idempotency_key is null or char_length(trim(idempotency_key)) between 1 and 120),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists product_pricing_history_idempotency_idx
  on public.product_pricing_history (product_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists product_pricing_history_product_idx
  on public.product_pricing_history (product_id, created_at desc);

comment on table public.product_pricing_history is
  'Decisión económica congelada al adoptar precio. Append-only desde la app.';

create or replace function public._pricing_metrics_from_final(
  p_production_cost numeric,
  p_final_price numeric,
  p_tax_rate_fraction numeric
)
returns jsonb
language plpgsql
immutable
as $$
declare
  v_net numeric;
  v_margin numeric;
  v_markup numeric;
begin
  if p_final_price <= 0 then
    return jsonb_build_object('adopted_net_price', null, 'actual_margin', null, 'actual_markup', null);
  end if;
  if coalesce(p_tax_rate_fraction, 0) > 0 then
    v_net := round(p_final_price / (1 + p_tax_rate_fraction), 4);
  else
    v_net := p_final_price;
  end if;
  if v_net > 0 then
    v_margin := (v_net - p_production_cost) / v_net;
  else
    v_margin := null;
  end if;
  if p_production_cost > 0 then
    v_markup := (v_net - p_production_cost) / p_production_cost;
  else
    v_markup := null;
  end if;
  return jsonb_build_object(
    'adopted_net_price', v_net,
    'actual_margin', v_margin,
    'actual_markup', v_markup
  );
end;
$$;

create or replace function public.adopt_product_pricing(
  p_product_id uuid,
  p_adopted_price numeric default null,
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
  v_pricing jsonb;
  v_prev numeric;
  v_suggested numeric;
  v_adopted numeric;
  v_prod_cost numeric;
  v_materials numeric;
  v_machine numeric;
  v_labor numeric;
  v_margin_pct numeric;
  v_tax_pct numeric;
  v_tax_frac numeric;
  v_rule text;
  v_metrics jsonb;
  v_history_id uuid;
  v_uid uuid;
begin
  if not public.is_admin() then
    raise exception 'Acceso denegado';
  end if;

  v_uid := auth.uid();

  if p_idempotency_key is not null and char_length(trim(p_idempotency_key)) > 0 then
    select *
    into v_existing
    from public.product_pricing_history h
    where h.product_id = p_product_id
      and h.idempotency_key = trim(p_idempotency_key)
    limit 1;

    if found then
      return jsonb_build_object(
        'idempotent_replay', true,
        'history_id', v_existing.id,
        'previous_price', v_existing.previous_price,
        'adopted_price', v_existing.adopted_price,
        'suggested_price', v_existing.suggested_price,
        'production_cost', v_existing.production_cost
      );
    end if;
  end if;

  select price into v_prev from public.products where id = p_product_id for update;
  if not found then
    raise exception 'Producto no encontrado';
  end if;

  v_pricing := public.calculate_product_pricing(p_product_id);
  v_suggested := (v_pricing->>'suggested_price')::numeric;
  v_prod_cost := (v_pricing->>'production_cost')::numeric;
  v_materials := (v_pricing->>'materials_cost')::numeric;
  v_machine := (v_pricing->>'machine_cost')::numeric;
  v_labor := (v_pricing->>'labor_cost')::numeric;
  v_margin_pct := (v_pricing->>'target_margin_on_sale_percent')::numeric;
  v_tax_pct := (v_pricing->>'tax_rate_percent')::numeric;
  v_rule := v_pricing->>'rounding_rule';
  v_tax_frac := coalesce(v_tax_pct, 0) / 100.0;

  v_adopted := coalesce(p_adopted_price, v_suggested);
  if v_adopted is null or v_adopted < 0 then
    raise exception 'Precio adoptado inválido';
  end if;

  v_metrics := public._pricing_metrics_from_final(v_prod_cost, v_adopted, v_tax_frac);

  insert into public.product_pricing_history (
    product_id,
    previous_price,
    adopted_price,
    production_cost,
    materials_cost,
    machine_cost,
    labor_cost,
    target_margin_percent,
    actual_margin_after_adoption,
    actual_markup_after_adoption,
    tax_rate_percent,
    rounding_rule,
    suggested_price,
    adopted_net_price,
    reason,
    idempotency_key,
    metadata,
    created_by
  )
  values (
    p_product_id,
    coalesce(v_prev, 0),
    round(v_adopted, 2),
    v_prod_cost,
    v_materials,
    v_machine,
    v_labor,
    coalesce(v_margin_pct, 0),
    (v_metrics->>'actual_margin')::numeric,
    (v_metrics->>'actual_markup')::numeric,
    coalesce(v_tax_pct, 0),
    coalesce(v_rule, 'none'),
    coalesce(v_suggested, 0),
    (v_metrics->>'adopted_net_price')::numeric,
    nullif(trim(p_reason), ''),
    case when p_idempotency_key is not null and char_length(trim(p_idempotency_key)) > 0
      then trim(p_idempotency_key) else null end,
    jsonb_build_object('source', 'gate_3b_adopt', 'price_semantics', 'tax_inclusive_final'),
    v_uid
  )
  returning id into v_history_id;

  update public.products
  set price = round(v_adopted, 2)
  where id = p_product_id;

  return jsonb_build_object(
    'idempotent_replay', false,
    'history_id', v_history_id,
    'previous_price', v_prev,
    'adopted_price', round(v_adopted, 2),
    'suggested_price', v_suggested,
    'production_cost', v_prod_cost,
    'actual_margin_after_adoption', (v_metrics->>'actual_margin')::numeric,
    'adopted_net_price', (v_metrics->>'adopted_net_price')::numeric
  );
end;
$$;

comment on function public.adopt_product_pricing(uuid, numeric, text, text) is
  'Admin-only atómico: recalcula pricing, registra historial congelado y actualiza products.price.';

revoke all on function public.adopt_product_pricing(uuid, numeric, text, text) from public;
revoke all on function public.adopt_product_pricing(uuid, numeric, text, text) from anon;
grant execute on function public.adopt_product_pricing(uuid, numeric, text, text) to authenticated;

revoke all on function public._pricing_metrics_from_final(numeric, numeric, numeric) from public;

alter table public.product_pricing_history enable row level security;

drop policy if exists "Pricing history: solo admin lectura" on public.product_pricing_history;
create policy "Pricing history: solo admin lectura"
  on public.product_pricing_history for select to authenticated
  using (public.is_admin());

drop policy if exists "Pricing history: sin acceso público" on public.product_pricing_history;
create policy "Pricing history: sin acceso público"
  on public.product_pricing_history for all to anon
  using (false)
  with check (false);

-- Inserts solo vía adopt_product_pricing (SECURITY DEFINER); no INSERT directo para authenticated.
grant select on public.product_pricing_history to authenticated;
grant all on public.product_pricing_history to service_role;
