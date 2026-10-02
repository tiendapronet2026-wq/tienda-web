-- Gate 3D — Precio objetivo por margen de contribución del canal

alter table public.channel_cost_profiles
  add column if not exists target_channel_margin_percent numeric(6, 2)
    check (
      target_channel_margin_percent is null
      or (target_channel_margin_percent >= 0 and target_channel_margin_percent < 100)
    );

comment on column public.channel_cost_profiles.target_channel_margin_percent is
  'Margen de contribución objetivo sobre venta neta (%), después de costos del perfil. Distinto de target_sale_margin_percent (Gate 3A).';

create or replace function public._channel_required_final_price(
  p_production_cost numeric,
  p_fixed_per_unit numeric,
  p_channel_fee_percent numeric,
  p_payment_fee_percent numeric,
  p_tax_rate_percent numeric,
  p_target_margin_percent numeric
)
returns jsonb
language plpgsql
immutable
as $$
declare
  v_m numeric;
  v_t numeric;
  v_r numeric;
  v_inv numeric;
  v_denom numeric;
  v_num numeric;
begin
  if p_target_margin_percent < 0 or p_target_margin_percent >= 100 then
    raise exception 'Margen de contribución objetivo inválido';
  end if;
  v_m := p_target_margin_percent / 100.0;
  v_t := coalesce(p_tax_rate_percent, 0) / 100.0;
  v_r := (coalesce(p_channel_fee_percent, 0) + coalesce(p_payment_fee_percent, 0)) / 100.0;
  if v_t > 0 then
    v_inv := 1.0 / (1.0 + v_t);
  else
    v_inv := 1.0;
  end if;
  v_denom := (1.0 - v_m) * v_inv - v_r;
  if v_denom <= 0 then
    return jsonb_build_object(
      'feasible', false,
      'infeasible_reason', 'Objetivo no alcanzable con esta estructura de fees e impuesto.',
      'raw_required_final_price', null,
      'variable_fee_rate', v_r,
      'denominator', v_denom
    );
  end if;
  v_num := coalesce(p_production_cost, 0) + coalesce(p_fixed_per_unit, 0);
  return jsonb_build_object(
    'feasible', true,
    'infeasible_reason', null,
    'raw_required_final_price', v_num / v_denom,
    'variable_fee_rate', v_r,
    'denominator', v_denom
  );
end;
$$;

create or replace function public._channel_profitability_core(
  p_final_price numeric,
  p_tax_rate_percent numeric,
  p_production_cost numeric,
  p_channel_fee_percent numeric,
  p_payment_fee_percent numeric,
  p_fixed_fee_per_order numeric,
  p_shipping_per_order numeric,
  p_other_per_order numeric,
  p_units_per_order numeric
)
returns jsonb
language plpgsql
immutable
as $$
declare
  v_units numeric;
  v_tax_frac numeric;
  v_net numeric;
  v_channel_rate numeric;
  v_payment_rate numeric;
  v_channel_fee numeric;
  v_payment_fee numeric;
  v_fixed_u numeric;
  v_ship_u numeric;
  v_other_u numeric;
  v_channel_cost numeric;
  v_contribution numeric;
  v_margin numeric;
  v_ropc numeric;
  v_be jsonb;
  v_be_price numeric;
begin
  if p_final_price is null or p_final_price < 0 then
    raise exception 'Precio final inválido';
  end if;
  if p_production_cost is null or p_production_cost < 0 then
    raise exception 'Costo de producción inválido';
  end if;
  if p_units_per_order is null or p_units_per_order <= 0 then
    raise exception 'Unidades por pedido inválidas';
  end if;
  if p_channel_fee_percent < 0 or p_channel_fee_percent >= 100
     or p_payment_fee_percent < 0 or p_payment_fee_percent >= 100 then
    raise exception 'Porcentaje de comisión inválido';
  end if;

  v_units := p_units_per_order;
  v_tax_frac := coalesce(p_tax_rate_percent, 0) / 100.0;
  if v_tax_frac > 0 then
    v_net := round(p_final_price / (1 + v_tax_frac), 4);
  else
    v_net := round(p_final_price, 4);
  end if;

  v_channel_rate := p_channel_fee_percent / 100.0;
  v_payment_rate := p_payment_fee_percent / 100.0;
  v_channel_fee := round(p_final_price * v_channel_rate, 2);
  v_payment_fee := round(p_final_price * v_payment_rate, 2);
  v_fixed_u := round(coalesce(p_fixed_fee_per_order, 0) / v_units, 4);
  v_ship_u := round(coalesce(p_shipping_per_order, 0) / v_units, 4);
  v_other_u := round(coalesce(p_other_per_order, 0) / v_units, 4);
  v_channel_cost := round(v_channel_fee + v_payment_fee + v_fixed_u + v_ship_u + v_other_u, 4);
  v_contribution := round(v_net - p_production_cost - v_channel_cost, 4);
  v_margin := case when v_net > 0 then v_contribution / v_net else null end;
  v_ropc := case when p_production_cost > 0 then v_contribution / p_production_cost else null end;

  v_be := public._channel_required_final_price(
    p_production_cost,
    v_fixed_u + v_ship_u + v_other_u,
    p_channel_fee_percent,
    p_payment_fee_percent,
    p_tax_rate_percent,
    0
  );
  v_be_price := case
    when (v_be->>'feasible')::boolean then round((v_be->>'raw_required_final_price')::numeric, 2)
    else null
  end;

  return jsonb_build_object(
    'final_price', round(p_final_price, 2),
    'tax_rate', coalesce(p_tax_rate_percent, 0),
    'net_sales_revenue', v_net,
    'production_cost', p_production_cost,
    'units_per_order', v_units,
    'channel_fee', v_channel_fee,
    'payment_fee', v_payment_fee,
    'fixed_fee_unit', v_fixed_u,
    'shipping_unit', v_ship_u,
    'other_cost_unit', v_other_u,
    'channel_cost_per_unit', v_channel_cost,
    'unit_contribution', v_contribution,
    'channel_margin', v_margin,
    'return_on_production_cost', v_ropc,
    'break_even_final_price', v_be_price,
    'break_even_viable', (v_be->>'feasible')::boolean
  );
end;
$$;

create or replace function public.calculate_product_channel_target_price(
  p_product_id uuid,
  p_profile_id uuid,
  p_target_margin_percent numeric default null,
  p_units_per_order numeric default null,
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
  v_profile record;
  v_settings record;
  v_cost jsonb;
  v_production numeric;
  v_units numeric;
  v_margin_pct numeric;
  v_rule text;
  v_fixed_u numeric;
  v_req jsonb;
  v_raw numeric;
  v_rounded numeric;
  v_fwd jsonb;
  v_gap numeric;
  v_gap_pct numeric;
begin
  if not public.is_admin() then
    raise exception 'Acceso denegado';
  end if;

  select id, price into v_prod from public.products where id = p_product_id;
  if not found then raise exception 'Producto no encontrado'; end if;

  select * into v_profile from public.channel_cost_profiles where id = p_profile_id;
  if not found then raise exception 'Perfil no encontrado'; end if;

  select tax_percentage, suggested_price_rounding_rule into v_settings
  from public.business_cost_settings where is_active = true limit 1;

  v_cost := public.calculate_product_production_cost(p_product_id);
  v_production := (v_cost->>'total_cost')::numeric;
  v_units := coalesce(p_units_per_order, v_profile.default_units_per_order);
  v_margin_pct := coalesce(p_target_margin_percent, v_profile.target_channel_margin_percent, 0);
  v_rule := coalesce(p_rounding_rule, v_settings.suggested_price_rounding_rule, 'none');

  v_fixed_u := round(
    coalesce(v_profile.fixed_fee_per_order, 0) / v_units
    + coalesce(v_profile.shipping_absorbed_per_order, 0) / v_units
    + coalesce(v_profile.other_cost_per_order, 0) / v_units,
    4
  );

  v_req := public._channel_required_final_price(
    v_production,
    v_fixed_u,
    v_profile.channel_fee_percent,
    v_profile.payment_fee_percent,
    coalesce(v_settings.tax_percentage, 0),
    v_margin_pct
  );

  if not (v_req->>'feasible')::boolean then
    return v_req || jsonb_build_object(
      'product_id', p_product_id,
      'profile_id', p_profile_id,
      'catalog_final_price', round(v_prod.price, 2),
      'target_channel_margin', v_margin_pct / 100.0,
      'production_cost', v_production,
      'fixed_cost_per_unit', v_fixed_u,
      'tax_rate', coalesce(v_settings.tax_percentage, 0)
    );
  end if;

  v_raw := (v_req->>'raw_required_final_price')::numeric;
  v_rounded := public._pricing_round_suggested(v_raw, v_rule);

  v_fwd := public._channel_profitability_core(
    v_rounded,
    coalesce(v_settings.tax_percentage, 0),
    v_production,
    v_profile.channel_fee_percent,
    v_profile.payment_fee_percent,
    v_profile.fixed_fee_per_order,
    v_profile.shipping_absorbed_per_order,
    v_profile.other_cost_per_order,
    v_units
  );

  v_gap := round(v_rounded - v_prod.price, 2);
  v_gap_pct := case when v_prod.price > 0 then v_gap / v_prod.price else null end;

  return jsonb_build_object(
    'feasible', true,
    'infeasible_reason', null,
    'product_id', p_product_id,
    'profile_id', p_profile_id,
    'catalog_final_price', round(v_prod.price, 2),
    'target_channel_margin', v_margin_pct / 100.0,
    'target_channel_margin_percent', v_margin_pct,
    'production_cost', v_production,
    'fixed_cost_per_unit', v_fixed_u,
    'variable_fee_rate', v_req->>'variable_fee_rate',
    'tax_rate', coalesce(v_settings.tax_percentage, 0),
    'raw_required_final_price', v_raw,
    'rounded_required_final_price', v_rounded,
    'rounding_rule', v_rule,
    'resulting_net_revenue', v_fwd->>'net_sales_revenue',
    'resulting_channel_cost', v_fwd->>'channel_cost_per_unit',
    'resulting_contribution', v_fwd->>'unit_contribution',
    'resulting_channel_margin', v_fwd->>'channel_margin',
    'current_price_gap', v_gap,
    'current_price_gap_percent', v_gap_pct
  );
end;
$$;

comment on function public.calculate_product_channel_target_price(uuid, uuid, numeric, numeric, text) is
  'Admin-only: precio final requerido para margen de contribución del canal (Gate 3D). No modifica products.price.';

revoke all on function public._channel_required_final_price(numeric, numeric, numeric, numeric, numeric, numeric) from public;
revoke all on function public.calculate_product_channel_target_price(uuid, uuid, numeric, numeric, text) from public;
revoke all on function public.calculate_product_channel_target_price(uuid, uuid, numeric, numeric, text) from anon;
grant execute on function public.calculate_product_channel_target_price(uuid, uuid, numeric, numeric, text) to authenticated;
