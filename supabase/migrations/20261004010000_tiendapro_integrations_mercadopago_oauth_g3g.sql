-- Gate 3G — OAuth Mercado Pago (PKCE + state en link session)

create or replace function public.attach_integration_link_oauth(
  p_session_id uuid,
  p_oauth_state text,
  p_code_challenge text,
  p_pkce_ciphertext text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Acceso denegado';
  end if;
  if p_oauth_state is null or char_length(trim(p_oauth_state)) < 16 then
    raise exception 'State inválido';
  end if;
  if p_code_challenge is null or char_length(trim(p_code_challenge)) < 16 then
    raise exception 'Challenge inválido';
  end if;
  if p_pkce_ciphertext is null or char_length(trim(p_pkce_ciphertext)) < 8 then
    raise exception 'PKCE inválido';
  end if;

  update public.integration_link_sessions
  set
    oauth_state = trim(p_oauth_state),
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'oauth_code_challenge', trim(p_code_challenge),
      'oauth_pkce_ciphertext', trim(p_pkce_ciphertext),
      'oauth_callback_used', false
    ),
    updated_at = now()
  where id = p_session_id
    and requested_by = auth.uid()
    and status = 'pending'
    and expires_at > now();

  if not found then
    raise exception 'Sesión no disponible';
  end if;
end;
$$;

revoke all on function public.attach_integration_link_oauth(uuid, text, text, text) from public;
grant execute on function public.attach_integration_link_oauth(uuid, text, text, text) to authenticated;

create or replace function public.resolve_integration_oauth_callback(
  p_oauth_state text,
  p_provider text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.integration_link_sessions%rowtype;
begin
  if p_oauth_state is null or char_length(trim(p_oauth_state)) < 16 then
    return jsonb_build_object('found', false, 'reason', 'invalid');
  end if;

  select * into v_row
  from public.integration_link_sessions
  where oauth_state = trim(p_oauth_state)
    and provider = trim(p_provider)
  for update;

  if not found then
    return jsonb_build_object('found', false, 'reason', 'invalid');
  end if;

  if coalesce((v_row.metadata->>'oauth_callback_used')::boolean, false) then
    return jsonb_build_object('found', false, 'reason', 'used');
  end if;

  if v_row.status = 'completed' then
    return jsonb_build_object('found', false, 'reason', 'used');
  end if;

  if v_row.status <> 'pending' then
    return jsonb_build_object('found', false, 'reason', 'invalid');
  end if;

  if v_row.expires_at <= now() then
    update public.integration_link_sessions
    set status = 'expired', updated_at = now()
    where id = v_row.id;
    return jsonb_build_object('found', false, 'reason', 'expired');
  end if;

  return jsonb_build_object(
    'found', true,
    'session_id', v_row.id,
    'token_hash', v_row.one_time_token_hash,
    'provider', v_row.provider,
    'pkce_ciphertext', v_row.metadata->>'oauth_pkce_ciphertext',
    'code_challenge', v_row.metadata->>'oauth_code_challenge'
  );
end;
$$;

revoke all on function public.resolve_integration_oauth_callback(text, text) from public;
grant execute on function public.resolve_integration_oauth_callback(text, text) to service_role;

create or replace function public.mark_integration_oauth_callback_used(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.integration_link_sessions
  set
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('oauth_callback_used', true),
    updated_at = now()
  where id = p_session_id;
end;
$$;

revoke all on function public.mark_integration_oauth_callback_used(uuid) from public;
grant execute on function public.mark_integration_oauth_callback_used(uuid) to service_role;

create or replace function public.resolve_integration_link_session_for_connect(p_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.integration_link_sessions%rowtype;
  v_requester text;
begin
  if p_token_hash is null or char_length(trim(p_token_hash)) < 32 then
    return jsonb_build_object('valid', false, 'reason', 'invalid');
  end if;

  select * into v_row
  from public.integration_link_sessions
  where one_time_token_hash = trim(p_token_hash);

  if not found then
    return jsonb_build_object('valid', false, 'reason', 'invalid');
  end if;

  if v_row.status = 'cancelled' then
    return jsonb_build_object('valid', false, 'reason', 'cancelled');
  end if;
  if v_row.status = 'completed' then
    return jsonb_build_object('valid', false, 'reason', 'used');
  end if;
  if v_row.status <> 'pending' then
    return jsonb_build_object('valid', false, 'reason', 'invalid');
  end if;

  if v_row.expires_at <= now() then
    update public.integration_link_sessions
    set status = 'expired', updated_at = now()
    where id = v_row.id and status = 'pending';
    perform public.log_integration_audit_event_core(
      'link_expired', v_row.provider, null, v_row.id, '{}'::jsonb, v_row.requested_by
    );
    return jsonb_build_object('valid', false, 'reason', 'expired');
  end if;

  select trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, ''))
  into v_requester
  from public.profiles p
  where p.id = v_row.requested_by;

  return jsonb_build_object(
    'valid', true,
    'session_id', v_row.id,
    'provider', v_row.provider,
    'expires_at', v_row.expires_at,
    'requester_label', coalesce(nullif(v_requester, ''), 'Administrador'),
    'oauth_state', v_row.oauth_state,
    'oauth_code_challenge', v_row.metadata->>'oauth_code_challenge'
  );
end;
$$;

grant execute on function public.store_integration_connection_credential(uuid, text, smallint) to service_role;

notify pgrst, 'reload schema';
