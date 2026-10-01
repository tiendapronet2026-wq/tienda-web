-- Gate 3C — Rentabilidad por canal (perfiles + simulación admin-only)

create table if not exists public.channel_cost_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique,
  channel_fee_percent numeric(6, 2) not null default 0
    check (channel_fee_percent >= 0 and channel_fee_percent < 100),
  payment_fee_percent numeric(6, 2) not null default 0
    check (payment_fee_percent >= 0 and payment_fee_percent < 100),
  fixed_fee_per_order numeric(14, 2) not null default 0
    check (fixed_fee_per_order >= 0),
  shipping_absorbed_per_order numeric(14, 2) not null default 0
    check (shipping_absorbed_per_order >= 0),
  other_cost_per_order numeric(14, 2) not null default 0
    check (other_cost_per_order >= 0),
  default_units_per_order numeric(10, 4) not null default 1
    check (default_units_per_order > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.channel_cost_profiles is
  'Perfil económico completo (canal + cobro + costos por pedido). Admin-only.';

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
  v_r numeric;
  v_denom numeric;
  v_be numeric;
  v_be_viable boolean;
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

  v_r := v_channel_rate + v_payment_rate;
  if v_tax_frac > 0 then
    v_denom := (1.0 / (1.0 + v_tax_frac)) - v_r;
  else
    v_denom := 1.0 - v_r;
  end if;
  if v_denom > 0 then
    v_be := round((p_production_cost + v_fixed_u + v_ship_u + v_other_u) / v_denom, 2);
    v_be_viable := true;
  else
    v_be := null;
    v_be_viable := false;
  end if;

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
    'break_even_final_price', v_be,
    'break_even_viable', v_be_viable
  );
end;
$$;

create or replace function public.calculate_product_channel_profitability(
  p_product_id uuid,
  p_profile_id uuid,
  p_final_price_override numeric default null,
  p_units_per_order numeric default null
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
  v_tax_pct numeric;
  v_cost jsonb;
  v_production numeric;
  v_catalog numeric;
  v_final numeric;
  v_units numeric;
  v_core jsonb;
begin
  if not public.is_admin() then
    raise exception 'Acceso denegado';
  end if;

  select id, price into v_prod from public.products where id = p_product_id;
  if not found then
    raise exception 'Producto no encontrado';
  end if;

  select * into v_profile from public.channel_cost_profiles where id = p_profile_id;
  if not found then
    raise exception 'Perfil no encontrado';
  end if;

  select tax_percentage into v_tax_pct
  from public.business_cost_settings
  where is_active = true
  limit 1;
  v_tax_pct := coalesce(v_tax_pct, 0);

  v_cost := public.calculate_product_production_cost(p_product_id);
  v_production := (v_cost->>'total_cost')::numeric;
  if v_production is null then
    raise exception 'Costo de producción no disponible';
  end if;

  v_catalog := coalesce(v_prod.price, 0);
  v_final := coalesce(p_final_price_override, v_catalog);
  v_units := coalesce(p_units_per_order, v_profile.default_units_per_order);

  v_core := public._channel_profitability_core(
    v_final,
    v_tax_pct,
    v_production,
    v_profile.channel_fee_percent,
    v_profile.payment_fee_percent,
    v_profile.fixed_fee_per_order,
    v_profile.shipping_absorbed_per_order,
    v_profile.other_cost_per_order,
    v_units
  );

  return v_core || jsonb_build_object(
    'product_id', p_product_id,
    'profile_id', p_profile_id,
    'catalog_final_price', round(v_catalog, 2),
    'profile_name', v_profile.name
  );
end;
$$;

comment on function public.calculate_product_channel_profitability(uuid, uuid, numeric, numeric) is
  'Admin-only: simula contribución unitaria por perfil de canal sin modificar precio ni historial.';

revoke all on function public._channel_profitability_core(numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric) from public;
revoke all on function public.calculate_product_channel_profitability(uuid, uuid, numeric, numeric) from public;
revoke all on function public.calculate_product_channel_profitability(uuid, uuid, numeric, numeric) from anon;
grant execute on function public.calculate_product_channel_profitability(uuid, uuid, numeric, numeric) to authenticated;

alter table public.channel_cost_profiles enable row level security;

drop policy if exists "Channel profiles: admin" on public.channel_cost_profiles;
create policy "Channel profiles: admin"
  on public.channel_cost_profiles for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Channel profiles: sin anon" on public.channel_cost_profiles;
create policy "Channel profiles: sin anon"
  on public.channel_cost_profiles for all to anon
  using (false)
  with check (false);

grant select, insert, update, delete on public.channel_cost_profiles to authenticated;
grant all on public.channel_cost_profiles to service_role;
