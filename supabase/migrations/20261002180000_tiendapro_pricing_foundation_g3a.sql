-- Gate 3A — Pricing foundation (consume Gate 2 total_cost; no auto-sync products.cost_price)

alter table public.products
  add column if not exists target_sale_margin_percent numeric(6, 2)
    check (
      target_sale_margin_percent is null
      or (target_sale_margin_percent >= 0 and target_sale_margin_percent < 100)
    );

comment on column public.products.target_sale_margin_percent is
  'Margen sobre venta objetivo (%). No es recargo sobre costo.';

alter table public.business_cost_settings
  add column if not exists default_target_sale_margin_percent numeric(6, 2) not null default 0
    check (default_target_sale_margin_percent >= 0 and default_target_sale_margin_percent < 100),
  add column if not exists suggested_price_rounding_rule text not null default 'none'
    check (suggested_price_rounding_rule in ('none', 'integer', 'ten', 'hundred'));

comment on column public.business_cost_settings.default_target_sale_margin_percent is
  'Margen sobre venta por defecto para precio sugerido (Gate 3A). Distinto de default_profit_margin_percentage (legacy markup en cost-engine).';

create table if not exists public.product_cost_snapshots (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  materials_cost numeric(14, 4) not null check (materials_cost >= 0),
  machine_cost numeric(14, 4) not null check (machine_cost >= 0),
  labor_cost numeric(14, 4) not null check (labor_cost >= 0),
  total_cost numeric(14, 4) not null check (total_cost >= 0),
  captured_at timestamptz not null default now(),
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists product_cost_snapshots_product_idx
  on public.product_cost_snapshots (product_id, captured_at desc);

comment on table public.product_cost_snapshots is
  'Registro explícito del costo calculado Gate 2 en un momento dado (no automático por request).';

create or replace function public._pricing_round_suggested(p_value numeric, p_rule text)
returns numeric
language plpgsql
immutable
as $$
begin
  case p_rule
    when 'none' then return round(p_value, 2);
    when 'integer' then return round(p_value);
    when 'ten' then return round(p_value / 10.0) * 10;
    when 'hundred' then return round(p_value / 100.0) * 100;
    else raise exception 'Regla de redondeo inválida';
  end case;
end;
$$;

create or replace function public._pricing_net_from_margin_on_sale(p_cost numeric, p_margin_fraction numeric)
returns numeric
language plpgsql
immutable
as $$
begin
  if p_margin_fraction < 0 or p_margin_fraction >= 1 then
    raise exception 'Margen objetivo inválido';
  end if;
  if p_cost < 0 then raise exception 'Costo inválido'; end if;
  if p_margin_fraction = 0 then return round(p_cost, 4); end if;
  return round(p_cost / (1 - p_margin_fraction), 4);
end;
$$;

create or replace function public.calculate_product_pricing(
  p_product_id uuid,
  p_target_margin_percent numeric default null,
  p_tax_rate_percent numeric default null,
  p_rounding_rule text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_prod record;
  v_settings record;
  v_cost jsonb;
  v_production numeric;
  v_price numeric;
  v_margin_pct numeric;
  v_tax_pct numeric;
  v_rule text;
  v_margin_frac numeric;
  v_tax_frac numeric;
  v_net numeric;
  v_tax_amt numeric;
  v_suggested numeric;
  v_actual_margin numeric;
  v_actual_markup numeric;
  v_unit_result numeric;
  v_current_net numeric;
begin
  if not public.is_admin() then
    raise exception 'Acceso denegado';
  end if;

  select id, price, cost_price, target_sale_margin_percent
  into v_prod
  from public.products
  where id = p_product_id;

  if not found then
    raise exception 'Producto no encontrado';
  end if;

  select
    default_target_sale_margin_percent,
    tax_percentage,
    suggested_price_rounding_rule
  into v_settings
  from public.business_cost_settings
  where is_active
  limit 1;

  v_cost := public.calculate_product_production_cost(p_product_id);
  v_production := coalesce((v_cost->>'total_cost')::numeric, 0);
  v_price := coalesce(v_prod.price, 0);

  v_margin_pct := coalesce(
    p_target_margin_percent,
    v_prod.target_sale_margin_percent,
    v_settings.default_target_sale_margin_percent,
    0
  );
  if v_margin_pct < 0 or v_margin_pct >= 100 then
    raise exception 'Margen objetivo inválido';
  end if;
  v_margin_frac := v_margin_pct / 100.0;

  v_tax_pct := coalesce(p_tax_rate_percent, v_settings.tax_percentage, 0);
  if v_tax_pct < 0 or v_tax_pct > 100 then
    raise exception 'Tasa impositiva inválida';
  end if;
  v_tax_frac := v_tax_pct / 100.0;

  v_rule := coalesce(p_rounding_rule, v_settings.suggested_price_rounding_rule, 'none');
  if v_rule not in ('none', 'integer', 'ten', 'hundred') then
    raise exception 'Regla de redondeo inválida';
  end if;

  v_net := public._pricing_net_from_margin_on_sale(v_production, v_margin_frac);
  v_tax_amt := round(v_net * v_tax_frac, 4);
  v_suggested := public._pricing_round_suggested(v_net + v_tax_amt, v_rule);

  -- Precio catálogo = final con impuesto referencia; margen/markup sobre neto derivado.
  if v_price > 0 then
    if v_tax_frac > 0 then
      v_current_net := round(v_price / (1 + v_tax_frac), 4);
    else
      v_current_net := v_price;
    end if;
    v_actual_margin := (v_current_net - v_production) / v_current_net;
  else
    v_current_net := null;
    v_actual_margin := null;
  end if;

  if v_production > 0 and v_current_net is not null then
    v_actual_markup := (v_current_net - v_production) / v_production;
  else
    v_actual_markup := null;
  end if;

  v_unit_result := round(v_price - v_production, 2);

  return jsonb_build_object(
    'production_cost', v_production,
    'materials_cost', coalesce((v_cost->>'materials_cost')::numeric, 0),
    'machine_cost', coalesce((v_cost->>'machine_cost')::numeric, 0),
    'labor_cost', coalesce((v_cost->>'labor_cost')::numeric, 0),
    'manual_cost_price', v_prod.cost_price,
    'current_sale_price', v_price,
    'current_net_sale_price', v_current_net,
    'price_semantics', 'tax_inclusive_final',
    'target_margin_on_sale_percent', v_margin_pct,
    'target_margin_on_sale_fraction', v_margin_frac,
    'net_price', v_net,
    'tax_rate_percent', v_tax_pct,
    'tax_amount', v_tax_amt,
    'rounding_rule', v_rule,
    'suggested_price', v_suggested,
    'actual_margin_on_sale', v_actual_margin,
    'actual_markup_on_cost', v_actual_markup,
    'unit_result', v_unit_result,
    'below_cost', v_unit_result < 0
  );
end;
$$;

comment on function public.calculate_product_pricing(uuid, numeric, numeric, text) is
  'Admin-only: costo Gate 2 (neto operativo) + precio catálogo (final con impuesto referencia). Margen/markup actuales sobre neto derivado. No modifica products.price ni cost_price.';

revoke all on function public.calculate_product_pricing(uuid, numeric, numeric, text) from public;
revoke all on function public.calculate_product_pricing(uuid, numeric, numeric, text) from anon;
grant execute on function public.calculate_product_pricing(uuid, numeric, numeric, text) to authenticated;

revoke all on function public._pricing_round_suggested(numeric, text) from public;
revoke all on function public._pricing_net_from_margin_on_sale(numeric, numeric) from public;

alter table public.product_cost_snapshots enable row level security;

drop policy if exists "Cost snapshots: solo admin" on public.product_cost_snapshots;
create policy "Cost snapshots: solo admin"
  on public.product_cost_snapshots for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Cost snapshots: sin acceso público" on public.product_cost_snapshots;
create policy "Cost snapshots: sin acceso público"
  on public.product_cost_snapshots for all to anon
  using (false)
  with check (false);

grant select, insert on public.product_cost_snapshots to authenticated;
grant all on public.product_cost_snapshots to service_role;
