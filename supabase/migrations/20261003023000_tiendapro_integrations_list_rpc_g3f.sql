-- Gate 3F: listado admin de conexiones vía RPC (security definer), evita vacíos por RLS/JWT en SSR.

create or replace function public.list_integration_connections_safe()
returns setof public.integration_connections
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Acceso denegado';
  end if;

  return query
  select *
  from public.integration_connections
  order by created_at desc;
end;
$$;

revoke all on function public.list_integration_connections_safe() from public;
grant execute on function public.list_integration_connections_safe() to authenticated;

notify pgrst, 'reload schema';
