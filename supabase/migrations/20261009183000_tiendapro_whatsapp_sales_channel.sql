-- Launch Track L3-WA — canal WhatsApp Business en conversaciones de venta

alter table public.sales_conversations
  drop constraint if exists sales_conversations_channel_check;

alter table public.sales_conversations
  add constraint sales_conversations_channel_check
  check (channel in ('facebook_messenger', 'whatsapp_business'));

comment on table public.sales_conversations is
  'Conversaciones bot vendedor (Messenger / WhatsApp). Sin tokens Meta en DB.';
