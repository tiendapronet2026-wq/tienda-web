import {
  getMetaAppSecret,
  getMetaPageAccessToken,
  getMetaPageId,
  META_GRAPH_API_VERSION,
} from "./config";
import { parseMetaMessengerWebhookPayload } from "./parse-events";
import { verifyMetaWebhookSignature } from "./signature";
import { verifyMetaWebhookSubscription } from "./webhook-verify";
import type {
  OutboundTextMessage,
  SalesMessagingProvider,
  WebhookVerifyQuery,
} from "@/lib/sales/providers/types";

export class MetaMessengerProvider implements SalesMessagingProvider {
  readonly channel = "facebook_messenger" as const;

  verifyWebhook(query: WebhookVerifyQuery) {
    return verifyMetaWebhookSubscription(query);
  }

  verifyPostSignature(rawBody: string, signatureHeader: string | null): boolean {
    const secret = getMetaAppSecret();
    if (!secret) return false;
    return verifyMetaWebhookSignature(rawBody, signatureHeader, secret);
  }

  parseIncomingEvents(payload: unknown) {
    return parseMetaMessengerWebhookPayload(payload);
  }

  async sendText(
    message: OutboundTextMessage,
  ): Promise<{ ok: true } | { ok: false; reason: string }> {
    const token = getMetaPageAccessToken();
    const pageId = getMetaPageId();
    if (!token || !pageId) {
      return { ok: false, reason: "meta_not_configured" };
    }

    const url = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${pageId}/messages`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messaging_type: "RESPONSE",
          recipient: { id: message.externalUserId },
          message: { text: message.text },
        }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.error("meta_send_failed", res.status, errText.slice(0, 200));
        return { ok: false, reason: "send_failed" };
      }
      return { ok: true };
    } catch {
      return { ok: false, reason: "network_error" };
    }
  }
}
