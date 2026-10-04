import type { MetaIncomingTextMessage } from "@/lib/sales/meta/parse-events";

export type WebhookVerifyQuery = {
  mode: string | null;
  token: string | null;
  challenge: string | null;
};

export type OutboundTextMessage = {
  externalUserId: string;
  text: string;
};

export interface SalesMessagingProvider {
  readonly channel: "facebook_messenger";

  verifyWebhook(query: WebhookVerifyQuery): { ok: true; challenge: string } | { ok: false };

  verifyPostSignature(rawBody: string, signatureHeader: string | null): boolean;

  parseIncomingEvents(payload: unknown): { messages: MetaIncomingTextMessage[]; ignored: number };

  sendText(message: OutboundTextMessage): Promise<{ ok: true } | { ok: false; reason: string }>;
}
