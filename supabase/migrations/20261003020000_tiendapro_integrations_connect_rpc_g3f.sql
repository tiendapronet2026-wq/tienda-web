-- Gate 3F: flujo /connect sin depender de service_role en edge (hash one-time).

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
    perform public.log_integration_audit_event(
      'link_expired', v_row.provider, null, v_row.id, '{}'::jsonb
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
    'oauth_state', v_row.oauth_state
  );
end;
$$;

create or replace function public.store_integration_connection_credential(
  p_connection_id uuid,
  p_ciphertext text,
  p_key_version smallint default 1
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_connection_id is null or p_ciphertext is null or char_length(trim(p_ciphertext)) < 8 then
    raise exception 'Credencial inválida';
  end if;
  if not exists (
    select 1 from public.integration_connections c
    where c.id = p_connection_id and c.status = 'connected' and c.is_active
  ) then
    raise exception 'Conexión no válida para credencial';
  end if;

  insert into public.integration_connection_credentials (
    connection_id, ciphertext, key_version, updated_at
  )
  values (p_connection_id, trim(p_ciphertext), coalesce(p_key_version, 1), now())
  on conflict (connection_id) do update
  set ciphertext = excluded.ciphertext,
      key_version = excluded.key_version,
      updated_at = now();
end;
$$;

revoke all on function public.resolve_integration_link_session_for_connect(text) from public;
revoke all on function public.store_integration_connection_credential(uuid, text, smallint) from public;
grant execute on function public.resolve_integration_link_session_for_connect(text) to anon, authenticated, service_role;
grant execute on function public.store_integration_connection_credential(uuid, text, smallint) to anon, authenticated, service_role;

grant execute on function public.finalize_integration_link_session(text, text, text, text, text, jsonb) to anon, authenticated;
