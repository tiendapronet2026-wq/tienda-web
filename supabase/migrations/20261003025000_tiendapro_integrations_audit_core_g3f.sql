-- Gate 3F: audit desde finalize (anon) sin exigir is_admin en el caller JWT.

create or replace function public.log_integration_audit_event_core(
  p_event_type text,
  p_provider text default null,
  p_connection_id uuid default null,
  p_link_session_id uuid default null,
  p_metadata jsonb default '{}'::jsonb,
  p_actor_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.integration_audit_events (
    event_type, provider, connection_id, link_session_id, actor_id, metadata
  )
  values (
    p_event_type,
    p_provider,
    p_connection_id,
    p_link_session_id,
    coalesce(p_actor_id, auth.uid()),
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.log_integration_audit_event_core(text, text, uuid, uuid, jsonb, uuid) from public;
grant execute on function public.log_integration_audit_event_core(text, text, uuid, uuid, jsonb, uuid) to service_role;

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
begin
  if auth.role() is distinct from 'service_role' and not public.is_admin() then
    raise exception 'Acceso denegado';
  end if;

  return public.log_integration_audit_event_core(
    p_event_type,
    p_provider,
    p_connection_id,
    p_link_session_id,
    p_metadata,
    auth.uid()
  );
end;
$$;

create or replace function public.finalize_integration_link_session(
  p_token_hash text,
  p_display_name text,
  p_external_account_id text,
  p_external_account_label text,
  p_connection_type text default 'oauth',
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sess public.integration_link_sessions%rowtype;
  v_conn_id uuid;
begin
  if p_token_hash is null or char_length(trim(p_token_hash)) < 32 then
    raise exception 'Token inválido';
  end if;

  select * into v_sess
  from public.integration_link_sessions
  where one_time_token_hash = trim(p_token_hash)
  for update;

  if not found then
    raise exception 'Sesión no encontrada';
  end if;

  if v_sess.status <> 'pending' then
    raise exception 'Sesión no disponible';
  end if;

  if v_sess.expires_at <= now() then
    update public.integration_link_sessions
    set status = 'expired', updated_at = now()
    where id = v_sess.id;
    perform public.log_integration_audit_event_core(
      'link_expired', v_sess.provider, null, v_sess.id, '{}'::jsonb, v_sess.requested_by
    );
    raise exception 'Sesión expirada';
  end if;

  insert into public.integration_connections (
    provider,
    connection_type,
    display_name,
    external_account_id,
    external_account_label,
    status,
    is_active,
    connected_by,
    connected_at,
    metadata
  )
  values (
    v_sess.provider,
    coalesce(nullif(trim(p_connection_type), ''), 'oauth'),
    trim(p_display_name),
    nullif(trim(p_external_account_id), ''),
    nullif(trim(p_external_account_label), ''),
    'connected',
    true,
    v_sess.requested_by,
    now(),
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_conn_id;

  update public.integration_link_sessions
  set status = 'completed',
      used_at = now(),
      connection_id = v_conn_id,
      updated_at = now()
  where id = v_sess.id;

  perform public.log_integration_audit_event_core(
    'link_completed',
    v_sess.provider,
    v_conn_id,
    v_sess.id,
    jsonb_build_object('external_account_label', p_external_account_label),
    v_sess.requested_by
  );

  return jsonb_build_object(
    'connection_id', v_conn_id,
    'session_id', v_sess.id,
    'provider', v_sess.provider
  );
end;
$$;

notify pgrst, 'reload schema';
