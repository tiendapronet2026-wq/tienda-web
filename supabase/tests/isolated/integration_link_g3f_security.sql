-- Gate 3F: link sessions y revoke solo admin.
\set ON_ERROR_STOP on

do $$
declare
  v_customer uuid := '44444444-4444-4444-4444-444444444444'::uuid;
  v_admin uuid := 'd32d6ad7-5a5a-4e30-b130-45f5e0eee019';
  v_blocked boolean := false;
  v_hash text := repeat('a', 64);
begin
  perform set_config('request.jwt.claim.sub', v_customer::text, true);
  begin
    perform public.create_integration_link_session('link_demo', v_hash, 300);
  exception
    when others then
      if sqlerrm like '%Acceso denegado%' then v_blocked := true; else raise; end if;
  end;
  if not v_blocked then
    raise exception 'FAIL: non-admin must not create_integration_link_session';
  end if;

  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  perform public.create_integration_link_session('link_demo', v_hash || '1', 300);
end $$;
