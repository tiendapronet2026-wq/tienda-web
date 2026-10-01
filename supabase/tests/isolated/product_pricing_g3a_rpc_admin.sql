-- Regresión Gate 3A: calculate_product_pricing solo admin.
\set ON_ERROR_STOP on

do $$
declare
  v_customer uuid := '44444444-4444-4444-4444-444444444444'::uuid;
  v_product uuid := '370b38c8-f486-44e5-9375-75ba97d19541'::uuid;
  v_blocked boolean := false;
begin
  insert into auth.users (id, email, raw_user_meta_data)
  values (v_customer, 'pricing-g3a-rpc-test@example.invalid', '{}')
  on conflict (id) do nothing;

  insert into public.profiles (id, role, first_name, last_name)
  values (v_customer, 'customer', 'G3A', 'Test')
  on conflict (id) do update set role = 'customer';

  perform set_config('request.jwt.claim.sub', v_customer::text, true);

  begin
    perform public.calculate_product_pricing(v_product);
  exception
    when others then
      if sqlerrm like '%Acceso denegado%' then
        v_blocked := true;
      else
        raise;
      end if;
  end;

  if not v_blocked then
    raise exception 'FAIL: non-admin must not execute calculate_product_pricing';
  end if;
end $$;

-- Caso J: precio sugerido = precio actual → margen actual ≈ objetivo (tax 21 %)
do $$
declare
  v_admin uuid;
  v_product uuid := '370b38c8-f486-44e5-9375-75ba97d19541'::uuid;
  v_json jsonb;
  v_suggested numeric;
  v_margin numeric;
  v_target numeric := 0.4;
  v_old_price numeric;
begin
  select p.id into v_admin
  from public.profiles p
  where p.role = 'admin' and p.status = 'active'
  limit 1;

  if v_admin is null then
    raise exception 'SKIP: no admin for pricing case J';
  end if;

  select price into v_old_price from public.products where id = v_product;
  if v_old_price is null then
    raise exception 'SKIP: product missing for pricing case J';
  end if;

  perform set_config('request.jwt.claim.sub', v_admin::text, true);

  v_json := public.calculate_product_pricing(v_product, 40, 21, 'none');
  v_suggested := (v_json->>'suggested_price')::numeric;

  update public.products set price = v_suggested where id = v_product;

  v_json := public.calculate_product_pricing(v_product, 40, 21, 'none');
  v_margin := (v_json->>'actual_margin_on_sale')::numeric;

  update public.products set price = v_old_price where id = v_product;

  if abs(v_margin - v_target) > 0.02 then
    raise exception 'FAIL case J: expected margin ~0.4 got %', v_margin;
  end if;
end $$;
