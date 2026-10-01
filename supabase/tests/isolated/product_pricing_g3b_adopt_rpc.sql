-- Regresión Gate 3B: adopt_product_pricing admin + idempotencia.
\set ON_ERROR_STOP on

do $$
declare
  v_customer uuid := '44444444-4444-4444-4444-444444444444'::uuid;
  v_blocked boolean := false;
begin
  perform set_config('request.jwt.claim.sub', v_customer::text, true);
  begin
    perform public.adopt_product_pricing(
      '370b38c8-f486-44e5-9375-75ba97d19541'::uuid,
      null,
      'test',
      'g3b-security-test-key'
    );
  exception
    when others then
      if sqlerrm like '%Acceso denegado%' then v_blocked := true; else raise; end if;
  end;
  if not v_blocked then
    raise exception 'FAIL: non-admin must not adopt_product_pricing';
  end if;
end $$;
