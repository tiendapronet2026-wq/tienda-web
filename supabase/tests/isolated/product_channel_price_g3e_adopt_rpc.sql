-- Regresión Gate 3E: adopt/revert channel price solo admin.
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
    raise exception 'TEST profile missing';
  end if;

  perform set_config('request.jwt.claim.sub', v_customer::text, true);
  begin
    perform public.adopt_product_channel_price(v_product, v_profile, 100, 'x', 'g3e-sec', null);
  exception
    when others then
      if sqlerrm like '%Acceso denegado%' then v_blocked := true; else raise; end if;
  end;
  if not v_blocked then
    raise exception 'FAIL: non-admin must not adopt_product_channel_price';
  end if;

  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  perform public.adopt_product_channel_price(v_product, v_profile, 100, 'rpc-test', 'g3e-sec-admin', null);
  perform public.revert_product_channel_price(v_product, v_profile, 'rpc-test-revert', 'g3e-sec-revert');
end $$;
