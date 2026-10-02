-- Gate 3F cierre: verificar conexión desde admin sin depender de service_role en Vercel.

create or replace function public.log_integration_audit_event(
  p_event_type text,
  p_provider text default null,
  p_connection_id uuid default null,
  p_link_session_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.role() is distinct from 'service_role' and not public.is_admin() then
    raise exception 'Acceso denegado';
  end if;

  insert into public.integration_audit_events (
    event_type, provider, connection_id, link_session_id, actor_id, metadata
  )
  values (
    p_event_type,
    p_provider,
    p_connection_id,
    p_link_session_id,
    auth.uid(),
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.log_integration_audit_event(text, text, uuid, uuid, jsonb) to authenticated;

notify pgrst, 'reload schema';
