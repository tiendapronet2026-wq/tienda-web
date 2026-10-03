export type MetaIncomingTextMessage = {
  externalUserId: string;
  providerMessageId: string;
  text: string;
  timestamp: number;
  isEcho: boolean;
};

export type MetaParseResult = {
  messages: MetaIncomingTextMessage[];
  ignored: number;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/** Parsea sólo mensajes de texto entrantes del usuario (sin echoes ni receipts). */
export function parseMetaMessengerWebhookPayload(payload: unknown): MetaParseResult {
  const messages: MetaIncomingTextMessage[] = [];
  let ignored = 0;

  if (!isRecord(payload) || payload.object !== "page") {
    return { messages, ignored: 1 };
  }

  const entries = Array.isArray(payload.entry) ? payload.entry : [];
  for (const entry of entries) {
    if (!isRecord(entry)) {
      ignored += 1;
      continue;
    }
    const batch = Array.isArray(entry.messaging) ? entry.messaging : [];
    for (const event of batch) {
      if (!isRecord(event)) {
        ignored += 1;
        continue;
      }
      if (event.delivery || event.read) {
        ignored += 1;
        continue;
      }
      const message = event.message;
      if (!isRecord(message)) {
        ignored += 1;
        continue;
      }
      if (message.is_echo === true) {
        ignored += 1;
        continue;
      }
      const text = typeof message.text === "string" ? message.text : "";
      if (!text.trim()) {
        ignored += 1;
        continue;
      }
      const sender = isRecord(event.sender) ? event.sender : null;
      const externalUserId = typeof sender?.id === "string" ? sender.id : "";
      const providerMessageId = typeof message.mid === "string" ? message.mid : "";
      if (!externalUserId || !providerMessageId) {
        ignored += 1;
        continue;
      }
      const timestamp = typeof event.timestamp === "number" ? event.timestamp : Date.now();
      messages.push({
        externalUserId,
        providerMessageId,
        text,
        timestamp,
        isEcho: false,
      });
    }
  }

  return { messages, ignored };
}
