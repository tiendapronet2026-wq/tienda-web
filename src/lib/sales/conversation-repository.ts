import type { SupabaseClient } from "@supabase/supabase-js";
import type { SalesBotIntent } from "@/lib/sales/bot-responder";
import { MESSENGER_TRACKING_SRC } from "@/lib/sales/tracking";

export type SalesConversationRow = {
  id: string;
  channel: string;
  external_user_id: string;
  tracking_token: string;
  state: string;
  handoff_requested: boolean;
  fallback_count: number;
  last_message_at: string;
};

const CHANNEL = "facebook_messenger";

export async function findOrCreateConversation(
  admin: SupabaseClient,
  externalUserId: string,
  source?: string,
): Promise<SalesConversationRow> {
  const { data: existing } = await admin
    .from("sales_conversations")
    .select(
      "id, channel, external_user_id, tracking_token, state, handoff_requested, fallback_count, last_message_at",
    )
    .eq("channel", CHANNEL)
    .eq("external_user_id", externalUserId)
    .maybeSingle<SalesConversationRow>();

  if (existing) {
    return existing;
  }

  const { data: created, error } = await admin
    .from("sales_conversations")
    .insert({
      channel: CHANNEL,
      external_user_id: externalUserId,
      source: source ?? MESSENGER_TRACKING_SRC,
      state: "new",
    })
    .select(
      "id, channel, external_user_id, tracking_token, state, handoff_requested, fallback_count, last_message_at",
    )
    .single<SalesConversationRow>();

  if (error || !created) {
    const { data: retry } = await admin
      .from("sales_conversations")
      .select(
        "id, channel, external_user_id, tracking_token, state, handoff_requested, fallback_count, last_message_at",
      )
      .eq("channel", CHANNEL)
      .eq("external_user_id", externalUserId)
      .maybeSingle<SalesConversationRow>();
    if (retry) return retry;
    throw new Error("conversation_create_failed");
  }

  return created;
}

export async function recordInboundMessage(
  admin: SupabaseClient,
  conversationId: string,
  providerMessageId: string,
  text: string,
): Promise<"new" | "duplicate"> {
  const { error } = await admin.from("sales_messages").insert({
    conversation_id: conversationId,
    provider_message_id: providerMessageId,
    direction: "inbound",
    message_type: "text",
    text,
  });

  if (error?.code === "23505") {
    return "duplicate";
  }
  if (error) {
    throw new Error("inbound_message_failed");
  }
  return "new";
}

export async function recordOutboundMessage(
  admin: SupabaseClient,
  conversationId: string,
  text: string,
) {
  await admin.from("sales_messages").insert({
    conversation_id: conversationId,
    direction: "outbound",
    provider_message_id: null,
    message_type: "text",
    text,
  });
}

export async function updateConversationAfterReply(
  admin: SupabaseClient,
  conversationId: string,
  intent: SalesBotIntent,
  opts: { handoff: boolean },
) {
  const { data: row } = await admin
    .from("sales_conversations")
    .select("fallback_count, state")
    .eq("id", conversationId)
    .maybeSingle<{ fallback_count: number; state: string }>();

  const prevFallback = row?.fallback_count ?? 0;
  const fallbackCount = intent === "FALLBACK" ? prevFallback + 1 : 0;

  let nextState = row?.state ?? "new";
  if (opts.handoff) {
    nextState = "handoff";
  } else if (intent === "COMPRAR") {
    nextState = "checkout_sent";
  } else if (intent !== "FALLBACK" && intent !== "SALUDO") {
    nextState = nextState === "new" ? "interested" : nextState;
  }

  const patch: Record<string, unknown> = {
    last_message_at: new Date().toISOString(),
    fallback_count: fallbackCount,
    state: nextState,
  };
  if (opts.handoff) {
    patch.handoff_requested = true;
  }

  await admin.from("sales_conversations").update(patch).eq("id", conversationId);
}

export function maskExternalUserId(externalUserId: string): string {
  if (externalUserId.length <= 6) return "••••••";
  return `${externalUserId.slice(0, 3)}•••${externalUserId.slice(-3)}`;
}

export async function closeSalesConversation(admin: SupabaseClient, conversationId: string) {
  await admin
    .from("sales_conversations")
    .update({ state: "closed", handoff_requested: false })
    .eq("id", conversationId);
}
