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
