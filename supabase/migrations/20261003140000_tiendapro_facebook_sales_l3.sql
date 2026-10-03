-- Launch Track L3 — conversaciones Messenger (sin tokens Meta en DB)

create table if not exists public.sales_conversations (
  id uuid primary key default gen_random_uuid(),
  channel text not null default 'facebook_messenger'
    check (channel in ('facebook_messenger')),
  external_user_id text not null,
  tracking_token text not null default encode(gen_random_bytes(16), 'hex'),
  state text not null default 'new'
    check (state in ('new', 'interested', 'checkout_sent', 'purchased', 'handoff', 'closed')),
  handoff_requested boolean not null default false,
  fallback_count int not null default 0,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  constraint sales_conversations_channel_external_user_key unique (channel, external_user_id),
  constraint sales_conversations_tracking_token_key unique (tracking_token)
);

create index if not exists sales_conversations_state_last_msg_idx
  on public.sales_conversations (state, last_message_at desc);

create table if not exists public.sales_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.sales_conversations(id) on delete cascade,
  direction text not null check (direction in ('inbound', 'outbound')),
  provider_message_id text,
  message_type text not null default 'text'
    check (message_type in ('text', 'system', 'unknown')),
  text text,
  created_at timestamptz not null default now(),
  constraint sales_messages_provider_message_id_key unique (provider_message_id)
);

create index if not exists sales_messages_conversation_created_idx
  on public.sales_messages (conversation_id, created_at desc);

drop trigger if exists sales_conversations_updated_at on public.sales_conversations;
create trigger sales_conversations_updated_at
  before update on public.sales_conversations
  for each row execute function public.set_updated_at();

alter table public.sales_conversations enable row level security;
alter table public.sales_messages enable row level security;

revoke all on table public.sales_conversations from anon;
revoke all on table public.sales_messages from anon;

create policy "Sales conversations admin"
  on public.sales_conversations for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Sales messages admin"
  on public.sales_messages for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on table public.sales_conversations to authenticated;
grant select on table public.sales_messages to authenticated;
grant all on table public.sales_conversations to service_role;
grant all on table public.sales_messages to service_role;

comment on table public.sales_conversations is
  'Canal ventas Messenger; external_user_id = PSID Meta (mínimo necesario).';
comment on table public.sales_messages is
  'Trazabilidad inbound/outbound; provider_message_id único para idempotencia webhook.';
