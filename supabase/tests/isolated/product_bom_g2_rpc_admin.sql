-- Regresión: RPC BOM roll-up no debe ejecutarse para authenticated no-admin.
\set ON_ERROR_STOP on

create or replace function test_set_auth(p_user uuid)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_user::text, true);
  execute 'set local role authenticated';
end;
$$;

do $$
declare
  v_customer uuid := '44444444-4444-4444-4444-444444444444'::uuid;
  v_product uuid := '370b38c8-f486-44e5-9375-75ba97d19541'::uuid;
  v_blocked boolean := false;
begin
  insert into auth.users (id, email, raw_user_meta_data)
  values (v_customer, 'bom-g2-rpc-test@example.invalid', '{}')
  on conflict (id) do nothing;

  insert into public.profiles (id, role, first_name, last_name)
  values (v_customer, 'customer', 'BOM', 'Test')
  on conflict (id) do update set role = 'customer';

  perform test_set_auth(v_customer);

  begin
    perform public.calculate_product_material_cost(v_product);
  exception
    when others then
      if sqlerrm like '%Acceso denegado%' or sqlerrm like '%permission denied%' then
        v_blocked := true;
      else
        raise;
      end if;
  end;

  if not v_blocked then
    raise exception 'FAIL: non-admin must not execute calculate_product_material_cost';
  end if;
end $$;
