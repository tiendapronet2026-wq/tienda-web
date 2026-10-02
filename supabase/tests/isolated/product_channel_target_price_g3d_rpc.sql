-- Regresión Gate 3D: calculate_product_channel_target_price solo admin.
\set ON_ERROR_STOP on

do $$
declare
  v_customer uuid := '44444444-4444-4444-4444-444444444444'::uuid;
  v_admin uuid := 'd32d6ad7-5a5a-4e30-b130-45f5e0eee019';
  v_product uuid := '370b38c8-f486-44e5-9375-75ba97d19541'::uuid;
  v_profile uuid;
  v_blocked boolean := false;
begin
  select id into v_profile from public.channel_cost_profiles where code = 'test-g3c-canal' limit 1;
  if v_profile is null then
    insert into public.channel_cost_profiles (name, code, channel_fee_percent, payment_fee_percent)
    values ('TEST G3D RPC', 'test-g3d-rpc', 0, 0)
    returning id into v_profile;
  end if;

  perform set_config('request.jwt.claim.sub', v_customer::text, true);
  begin
    perform public.calculate_product_channel_target_price(v_product, v_profile, 40, null, null);
  exception
    when others then
      if sqlerrm like '%Acceso denegado%' then v_blocked := true; else raise; end if;
  end;
  if not v_blocked then
    raise exception 'FAIL: non-admin must not execute calculate_product_channel_target_price';
  end if;

  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  perform public.calculate_product_channel_target_price(v_product, v_profile, 40, null, null);
end $$;
