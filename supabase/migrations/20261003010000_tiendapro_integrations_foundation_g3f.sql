-- Gate 3F — Fundación de integraciones (conexiones, link sessions, auditoría)

create table if not exists public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  connection_type text not null default 'oauth',
  display_name text not null,
  external_account_id text,
  external_account_label text,
  status text not null default 'pending'
    check (status in ('pending', 'connected', 'expired', 'revoked', 'error')),
  is_active boolean not null default true,
  connected_by uuid references auth.users(id) on delete set null,
  connected_at timestamptz,
  last_verified_at timestamptz,
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists integration_connections_one_active_per_provider_idx
  on public.integration_connections (provider)
  where is_active = true and status = 'connected';

create index if not exists integration_connections_status_idx
  on public.integration_connections (provider, status);

comment on table public.integration_connections is
  'Conexiones a proveedores externos. Sin secretos en esta tabla.';

create table if not exists public.integration_link_sessions (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  requested_by uuid not null references auth.users(id) on delete cascade,
  one_time_token_hash text not null,
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'expired', 'cancelled')),
  expires_at timestamptz not null,
  used_at timestamptz,
  connection_id uuid references public.integration_connections(id) on delete set null,
  oauth_state text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint integration_link_sessions_token_hash_key unique (one_time_token_hash)
);

create index if not exists integration_link_sessions_requested_idx
  on public.integration_link_sessions (requested_by, created_at desc);

comment on table public.integration_link_sessions is
  'Sesiones one-time para QR / vinculación. Solo hash del token, no token plano.';

create table if not exists public.integration_connection_credentials (
  connection_id uuid primary key references public.integration_connections(id) on delete cascade,
  ciphertext text not null,
  key_version smallint not null default 1 check (key_version > 0),
  updated_at timestamptz not null default now()
);

comment on table public.integration_connection_credentials is
  'Secretos cifrados server-side. Sin acceso directo vía API cliente.';

create table if not exists public.integration_audit_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (
    event_type in (
      'link_started',
      'link_completed',
      'link_expired',
      'link_cancelled',
      'connection_verified',
      'connection_failed',
      'connection_revoked'
    )
  ),
  provider text,
  connection_id uuid references public.integration_connections(id) on delete set null,
  link_session_id uuid references public.integration_link_sessions(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists integration_audit_events_created_idx
  on public.integration_audit_events (created_at desc);

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

create or replace function public.create_integration_link_session(
  p_provider text,
  p_token_hash text,
  p_ttl_seconds int default 300
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_expires timestamptz;
begin
  if not public.is_admin() then
    raise exception 'Acceso denegado';
  end if;
  if p_token_hash is null or char_length(trim(p_token_hash)) < 32 then
    raise exception 'Token hash inválido';
  end if;
  if p_provider is null or char_length(trim(p_provider)) < 2 then
    raise exception 'Proveedor inválido';
  end if;

  v_expires := now() + make_interval(secs => greatest(60, least(p_ttl_seconds, 900)));

  insert into public.integration_link_sessions (
    provider,
    requested_by,
    one_time_token_hash,
    status,
    expires_at
  )
  values (
    trim(p_provider),
    auth.uid(),
    trim(p_token_hash),
    'pending',
    v_expires
  )
  returning id into v_id;

  perform public.log_integration_audit_event(
    'link_started',
    trim(p_provider),
    null,
    v_id,
    jsonb_build_object('expires_at', v_expires)
  );

  return jsonb_build_object(
    'session_id', v_id,
    'expires_at', v_expires,
    'status', 'pending'
  );
end;
$$;

create or replace function public.get_integration_link_session_status(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.integration_link_sessions%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Acceso denegado';
  end if;

  select * into v_row
  from public.integration_link_sessions
  where id = p_session_id;

  if not found then
    raise exception 'Sesión no encontrada';
  end if;

  if v_row.requested_by is distinct from auth.uid() and not public.is_admin() then
    raise exception 'Acceso denegado';
  end if;

  if v_row.status = 'pending' and v_row.expires_at <= now() then
    update public.integration_link_sessions
    set status = 'expired', updated_at = now()
    where id = p_session_id and status = 'pending';
    perform public.log_integration_audit_event(
      'link_expired', v_row.provider, v_row.connection_id, v_row.id, '{}'::jsonb
    );
    v_row.status := 'expired';
  end if;

  return jsonb_build_object(
    'session_id', v_row.id,
    'status', v_row.status,
    'provider', v_row.provider,
    'expires_at', v_row.expires_at,
    'connection_id', v_row.connection_id,
    'used_at', v_row.used_at
  );
end;
$$;

create or replace function public.cancel_integration_link_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.integration_link_sessions%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Acceso denegado';
  end if;

  select * into v_row from public.integration_link_sessions where id = p_session_id for update;
  if not found then raise exception 'Sesión no encontrada'; end if;
  if v_row.requested_by is distinct from auth.uid() then
    raise exception 'Acceso denegado';
  end if;
  if v_row.status <> 'pending' then
    return jsonb_build_object('cancelled', false, 'status', v_row.status);
  end if;

  update public.integration_link_sessions
  set status = 'cancelled', updated_at = now()
  where id = p_session_id;

  perform public.log_integration_audit_event(
    'link_cancelled', v_row.provider, null, v_row.id, '{}'::jsonb
  );

  return jsonb_build_object('cancelled', true, 'status', 'cancelled');
end;
$$;

create or replace function public.revoke_integration_connection(p_connection_id uuid, p_reason text default null)
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

  select * into v_row from public.integration_connections where id = p_connection_id for update;
  if not found then raise exception 'Conexión no encontrada'; end if;

  update public.integration_connections
  set status = 'revoked',
      is_active = false,
      revoked_at = now(),
      updated_at = now()
  where id = p_connection_id;

  delete from public.integration_connection_credentials where connection_id = p_connection_id;

  perform public.log_integration_audit_event(
    'connection_revoked',
    v_row.provider,
    p_connection_id,
    null,
    jsonb_build_object('reason', nullif(trim(p_reason), ''))
  );

  return jsonb_build_object('revoked', true, 'connection_id', p_connection_id);
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
    perform public.log_integration_audit_event(
      'link_expired', v_sess.provider, null, v_sess.id, '{}'::jsonb
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

  perform public.log_integration_audit_event(
    'link_completed',
    v_sess.provider,
    v_conn_id,
    v_sess.id,
    jsonb_build_object('external_account_label', p_external_account_label)
  );

  return jsonb_build_object(
    'connection_id', v_conn_id,
    'session_id', v_sess.id,
    'provider', v_sess.provider
  );
end;
$$;

revoke all on function public.finalize_integration_link_session(text, text, text, text, text, jsonb) from public;
revoke all on function public.finalize_integration_link_session(text, text, text, text, text, jsonb) from anon;
grant execute on function public.finalize_integration_link_session(text, text, text, text, text, jsonb) to service_role;

revoke all on function public.log_integration_audit_event(text, text, uuid, uuid, jsonb) from public;
revoke all on function public.create_integration_link_session(text, text, int) from public;
revoke all on function public.create_integration_link_session(text, text, int) from anon;
revoke all on function public.get_integration_link_session_status(uuid) from public;
revoke all on function public.get_integration_link_session_status(uuid) from anon;
revoke all on function public.cancel_integration_link_session(uuid) from public;
revoke all on function public.cancel_integration_link_session(uuid) from anon;
revoke all on function public.revoke_integration_connection(uuid, text) from public;
revoke all on function public.revoke_integration_connection(uuid, text) from anon;

grant execute on function public.create_integration_link_session(text, text, int) to authenticated;
grant execute on function public.get_integration_link_session_status(uuid) to authenticated;
grant execute on function public.cancel_integration_link_session(uuid) to authenticated;
grant execute on function public.revoke_integration_connection(uuid, text) to authenticated;
grant execute on function public.log_integration_audit_event(text, text, uuid, uuid, jsonb) to service_role;

alter table public.integration_connections enable row level security;
alter table public.integration_link_sessions enable row level security;
alter table public.integration_connection_credentials enable row level security;
alter table public.integration_audit_events enable row level security;

drop policy if exists "Integration connections admin" on public.integration_connections;
create policy "Integration connections admin"
  on public.integration_connections for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Integration connections deny anon" on public.integration_connections;
create policy "Integration connections deny anon"
  on public.integration_connections for all to anon using (false) with check (false);

drop policy if exists "Integration link sessions admin" on public.integration_link_sessions;
create policy "Integration link sessions admin"
  on public.integration_link_sessions for select to authenticated
  using (public.is_admin() and requested_by = auth.uid());

drop policy if exists "Integration link sessions deny anon" on public.integration_link_sessions;
create policy "Integration link sessions deny anon"
  on public.integration_link_sessions for all to anon using (false) with check (false);

drop policy if exists "Integration credentials deny all" on public.integration_connection_credentials;
create policy "Integration credentials deny all"
  on public.integration_connection_credentials for all to authenticated using (false) with check (false);

drop policy if exists "Integration credentials deny anon" on public.integration_connection_credentials;
create policy "Integration credentials deny anon"
  on public.integration_connection_credentials for all to anon using (false) with check (false);

drop policy if exists "Integration audit admin read" on public.integration_audit_events;
create policy "Integration audit admin read"
  on public.integration_audit_events for select to authenticated
  using (public.is_admin());

drop policy if exists "Integration audit deny anon" on public.integration_audit_events;
create policy "Integration audit deny anon"
  on public.integration_audit_events for all to anon using (false) with check (false);

grant select, insert, update, delete on public.integration_connections to authenticated;
grant select on public.integration_link_sessions to authenticated;
grant select on public.integration_audit_events to authenticated;
grant all on public.integration_connections to service_role;
grant all on public.integration_link_sessions to service_role;
grant all on public.integration_connection_credentials to service_role;
grant all on public.integration_audit_events to service_role;
