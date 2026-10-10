import type { MetaIncomingTextMessage } from "@/lib/sales/meta/parse-events";

export type WhatsAppParseResult = {
  messages: MetaIncomingTextMessage[];
  ignored: number;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/** Parsea mensajes de texto entrantes del webhook WhatsApp Cloud API. */
export function parseWhatsAppCloudWebhookPayload(payload: unknown): WhatsAppParseResult {
  const messages: MetaIncomingTextMessage[] = [];
  let ignored = 0;

  if (!isRecord(payload) || payload.object !== "whatsapp_business_account") {
    return { messages, ignored: 1 };
  }

  const entries = Array.isArray(payload.entry) ? payload.entry : [];
  for (const entry of entries) {
    if (!isRecord(entry)) {
      ignored += 1;
      continue;
    }
    const changes = Array.isArray(entry.changes) ? entry.changes : [];
    for (const change of changes) {
      if (!isRecord(change) || change.field !== "messages") {
        ignored += 1;
        continue;
      }
      const value = isRecord(change.value) ? change.value : null;
      if (!value || value.messaging_product !== "whatsapp") {
        ignored += 1;
        continue;
      }

      const batch = Array.isArray(value.messages) ? value.messages : [];
      for (const message of batch) {
        if (!isRecord(message)) {
          ignored += 1;
          continue;
        }
        if (message.type !== "text") {
          ignored += 1;
          continue;
        }
        const textBody = isRecord(message.text) ? message.text.body : null;
        const text = typeof textBody === "string" ? textBody : "";
        if (!text.trim()) {
          ignored += 1;
          continue;
        }
        const externalUserId = typeof message.from === "string" ? message.from : "";
        const providerMessageId = typeof message.id === "string" ? message.id : "";
        if (!externalUserId || !providerMessageId) {
          ignored += 1;
          continue;
        }
        const tsRaw = message.timestamp;
        const timestamp =
          typeof tsRaw === "string"
            ? Number.parseInt(tsRaw, 10) * 1000
            : typeof tsRaw === "number"
              ? tsRaw * 1000
              : Date.now();

        messages.push({
          externalUserId,
          providerMessageId,
          text,
          timestamp: Number.isFinite(timestamp) ? timestamp : Date.now(),
          isEcho: false,
        });
      }

      if (!batch.length && (value.statuses || value.errors)) {
        ignored += 1;
      }
    }
  }

  return { messages, ignored };
}
