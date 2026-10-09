import type { SupabaseClient } from "@supabase/supabase-js";
import type { MetaIncomingTextMessage } from "@/lib/sales/meta/parse-events";
import type { SalesMessagingProvider } from "@/lib/sales/providers/types";
import { RuleBasedResponder } from "@/lib/sales/rule-based-responder";
import { SALES_CHANNEL_TRACKING_SRC } from "@/lib/sales/channels";
import { loadPack150Catalog } from "@/lib/sales/pack-catalog";
import {
  findOrCreateConversation,
  recordInboundMessage,
  recordOutboundMessage,
  updateConversationAfterReply,
} from "@/lib/sales/conversation-repository";

export type MessengerHandlerResult = {
  processed: number;
  skipped: number;
  duplicates: number;
  errors: number;
};

export async function handleIncomingMessengerMessages(
  admin: SupabaseClient,
  provider: SalesMessagingProvider,
  messages: MetaIncomingTextMessage[],
  bot = new RuleBasedResponder(),
): Promise<MessengerHandlerResult> {
  const result: MessengerHandlerResult = {
    processed: 0,
    skipped: 0,
    duplicates: 0,
    errors: 0,
  };

  for (const msg of messages) {
    if (msg.isEcho) {
      result.skipped += 1;
      continue;
    }

    try {
      const conversation = await findOrCreateConversation(
        admin,
        provider.channel,
        msg.externalUserId,
      );

      const inbound = await recordInboundMessage(
        admin,
        conversation.id,
        msg.providerMessageId,
        msg.text,
      );
      if (inbound === "duplicate") {
        result.duplicates += 1;
        continue;
      }

      if (conversation.handoff_requested || conversation.state === "handoff") {
        result.skipped += 1;
        continue;
      }

      const catalog = await loadPack150Catalog(admin, {
        trackingToken: conversation.tracking_token,
        trackingSrc: SALES_CHANNEL_TRACKING_SRC[provider.channel],
      });
      const intent = bot.classifyIntent(msg.text);
      const consecutiveFallbacks =
        intent === "FALLBACK" ? conversation.fallback_count + 1 : conversation.fallback_count;
      const handoff = bot.shouldOfferHandoff(intent, consecutiveFallbacks);

      const replyText = bot.reply(intent, {
        packPriceFormatted: catalog.priceFormatted,
        offerUrl: catalog.offerUrl,
        productAvailable: catalog.isActive,
        consecutiveFallbacks,
      });

      const send = await provider.sendText({
        externalUserId: msg.externalUserId,
        text: replyText,
      });

      if (!send.ok) {
        result.errors += 1;
        continue;
      }

      await recordOutboundMessage(admin, conversation.id, replyText);
      await updateConversationAfterReply(admin, conversation.id, intent, { handoff });
      result.processed += 1;
    } catch {
      result.errors += 1;
    }
  }

  return result;
}
