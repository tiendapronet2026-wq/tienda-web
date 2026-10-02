-- Gate 3F: lectura admin de una conexión (verify/revoke sin SELECT directo bajo RLS).

create or replace function public.get_integration_connection_admin(p_connection_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.integration_connections%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Acceso denegado';
  end if;

  select * into v_row
  from public.integration_connections
  where id = p_connection_id;

  if not found then
    return jsonb_build_object('found', false);
  end if;

  return jsonb_build_object(
    'found', true,
    'id', v_row.id,
    'provider', v_row.provider,
    'status', v_row.status,
    'is_active', v_row.is_active
  );
end;
$$;

revoke all on function public.get_integration_connection_admin(uuid) from public;
grant execute on function public.get_integration_connection_admin(uuid) to authenticated;

create or replace function public.touch_integration_connection_verified(p_connection_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Acceso denegado';
  end if;

  update public.integration_connections
  set last_verified_at = now(), updated_at = now()
  where id = p_connection_id and status = 'connected' and is_active;
end;
$$;

revoke all on function public.touch_integration_connection_verified(uuid) from public;
grant execute on function public.touch_integration_connection_verified(uuid) to authenticated;

notify pgrst, 'reload schema';
