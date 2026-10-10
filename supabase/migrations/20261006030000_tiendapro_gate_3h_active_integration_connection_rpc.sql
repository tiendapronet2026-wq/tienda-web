-- Gate 3H: resolver conexión MP activa desde service_role (evita vacíos por RLS/policies en SELECT directo).

create or replace function public.get_active_integration_connection_id(p_provider text)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select c.id
  from public.integration_connections c
  where c.provider = trim(p_provider)
    and c.status = 'connected'
    and c.is_active = true
  order by c.connected_at desc nulls last, c.updated_at desc
  limit 1;
$$;

revoke all on function public.get_active_integration_connection_id(text) from public;
grant execute on function public.get_active_integration_connection_id(text) to service_role;

notify pgrst, 'reload schema';
