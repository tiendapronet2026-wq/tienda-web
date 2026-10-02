-- Gate 3E escenarios A–I (producto TEST). Requiere migración g3e aplicada.
\set ON_ERROR_STOP on

do $$
declare
  v_admin uuid := 'd32d6ad7-5a5a-4e30-b130-45f5e0eee019';
  v_product uuid := '370b38c8-f486-44e5-9375-75ba97d19541'::uuid;
  v_profile uuid;
  v_catalog numeric;
  v_catalog_before numeric;
  v_resp jsonb;
  v_effective numeric;
  v_count int;
  v_hist_id uuid;
begin
  perform set_config('request.jwt.claim.sub', v_admin::text, true);

  select id into v_profile from public.channel_cost_profiles where code = 'test-g3c-canal' limit 1;
  if v_profile is null then
    insert into public.channel_cost_profiles (
      name, code, channel_fee_percent, payment_fee_percent,
      shipping_absorbed_per_order, target_channel_margin_percent, is_active
    )
    values ('TEST G3E', 'test-g3c-canal', 8, 3, 500, 40, true)
    returning id into v_profile;
  else
    update public.channel_cost_profiles set is_active = true where id = v_profile;
  end if;

  -- limpiar override previo
  update public.product_channel_prices
  set is_active = false
  where product_id = v_product and channel_cost_profile_id = v_profile;

  select price into v_catalog_before from public.products where id = v_product;

  -- C: fallback sin override
  v_effective := public.effective_channel_final_price(v_product, v_profile);
  if v_effective is distinct from v_catalog_before then
    raise exception 'FAIL C: fallback debe ser catálogo (got %, expected %)', v_effective, v_catalog_before;
  end if;

  -- A: adopción objetivo (manual 11500 si target RPC falla)
  v_resp := public.adopt_product_channel_price(
    v_product, v_profile, 11500, 'test-A-target', 'g3e-scenario-A', null
  );
  if (v_resp->>'idempotent_replay')::boolean then
    raise exception 'FAIL A: primera adopción no debe ser replay';
  end if;

  select price into v_catalog from public.products where id = v_product;
  if v_catalog is distinct from v_catalog_before then
    raise exception 'FAIL I: products.price cambió tras adopción canal';
  end if;

  if not exists (
    select 1 from public.product_channel_prices
    where product_id = v_product and channel_cost_profile_id = v_profile
      and is_active and final_price = 11500
  ) then
    raise exception 'FAIL A: override canal 11500 no activo';
  end if;

  -- B: adopción manual
  v_resp := public.adopt_product_channel_price(
    v_product, v_profile, 11200, 'test-B-manual', 'g3e-scenario-B', null
  );
  if (v_resp->>'adopted_price')::numeric <> 11200 then
    raise exception 'FAIL B: precio adoptado incorrecto';
  end if;
  if (v_resp->>'resulting_channel_margin') is null then
    raise exception 'FAIL B: margen resultante faltante';
  end if;

  -- G: idempotencia
  v_resp := public.adopt_product_channel_price(
    v_product, v_profile, 11200, 'test-B-manual', 'g3e-scenario-B', null
  );
  if not (v_resp->>'idempotent_replay')::boolean then
    raise exception 'FAIL G: segunda llamada debe ser replay';
  end if;
  select count(*) into v_count
  from public.product_channel_price_history
  where product_id = v_product and channel_cost_profile_id = v_profile
    and idempotency_key = 'g3e-scenario-B';
  if v_count <> 1 then
    raise exception 'FAIL G: historial duplicado (count=%)', v_count;
  end if;

  -- D: volver a general
  v_resp := public.revert_product_channel_price(
    v_product, v_profile, 'test-D-revert', 'g3e-scenario-D'
  );
  if not (v_resp->>'reverted')::boolean then
    raise exception 'FAIL D: revert no aplicado';
  end if;
  v_effective := public.effective_channel_final_price(v_product, v_profile);
  if v_effective is distinct from v_catalog_before then
    raise exception 'FAIL D: tras revert debe usar catálogo';
  end if;

  select count(*) into v_count
  from public.product_channel_price_history
  where product_id = v_product and channel_cost_profile_id = v_profile;
  if v_count < 3 then
    raise exception 'FAIL D: historial debe conservarse (count=%)', v_count;
  end if;

  -- E: historial congelado — tomar fila A y verificar adopted_price fijo
  select adopted_price into v_catalog
  from public.product_channel_price_history
  where product_id = v_product and idempotency_key = 'g3e-scenario-A'
  limit 1;
  if v_catalog <> 11500 then
    raise exception 'FAIL E: historial A debe conservar 11500';
  end if;

  -- cleanup: revert idempotent keys de prueba no borran historial
  perform public.revert_product_channel_price(v_product, v_profile, 'cleanup', 'g3e-scenario-cleanup');
end $$;
