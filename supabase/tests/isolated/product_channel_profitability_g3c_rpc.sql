-- Regresión Gate 3C: calculate_product_channel_profitability solo admin.
\set ON_ERROR_STOP on

do $$
declare
  v_customer uuid := '44444444-4444-4444-4444-444444444444'::uuid;
  v_admin uuid := 'd32d6ad7-5a5a-4e30-b130-45f5e0eee019';
  v_product uuid := '370b38c8-f486-44e5-9375-75ba97d19541'::uuid;
  v_profile uuid;
  v_blocked boolean := false;
begin
  insert into public.channel_cost_profiles (name, code, channel_fee_percent, payment_fee_percent)
  values ('TEST G3C RPC', 'test-g3c-rpc-security', 0, 0)
  on conflict (code) do update set name = excluded.name
  returning id into v_profile;

  if v_profile is null then
    select id into v_profile from public.channel_cost_profiles where code = 'test-g3c-rpc-security';
  end if;

  perform set_config('request.jwt.claim.sub', v_customer::text, true);
  begin
    perform public.calculate_product_channel_profitability(v_product, v_profile, null, null);
  exception
    when others then
      if sqlerrm like '%Acceso denegado%' then v_blocked := true; else raise; end if;
  end;
  if not v_blocked then
    raise exception 'FAIL: non-admin must not execute calculate_product_channel_profitability';
  end if;

  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  perform public.calculate_product_channel_profitability(v_product, v_profile, null, null);
end $$;
