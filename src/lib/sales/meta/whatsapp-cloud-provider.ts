import { getMetaAppSecret, META_GRAPH_API_VERSION } from "@/lib/sales/meta/config";
import { parseWhatsAppCloudWebhookPayload } from "@/lib/sales/meta/parse-whatsapp-events";
import { verifyMetaWebhookSignature } from "@/lib/sales/meta/signature";
import { verifyMetaWebhookSubscription } from "@/lib/sales/meta/webhook-verify";
import {
  getWhatsAppAccessToken,
  getWhatsAppPhoneNumberId,
} from "@/lib/sales/meta/whatsapp-config";
import type {
  OutboundTextMessage,
  SalesMessagingProvider,
  WebhookVerifyQuery,
} from "@/lib/sales/providers/types";

export class WhatsAppCloudProvider implements SalesMessagingProvider {
  readonly channel = "whatsapp_business" as const;

  verifyWebhook(query: WebhookVerifyQuery) {
    return verifyMetaWebhookSubscription(query);
  }

  verifyPostSignature(rawBody: string, signatureHeader: string | null): boolean {
    const secret = getMetaAppSecret();
    if (!secret) return false;
    return verifyMetaWebhookSignature(rawBody, signatureHeader, secret);
  }

  parseIncomingEvents(payload: unknown) {
    return parseWhatsAppCloudWebhookPayload(payload);
  }

  async sendText(
    message: OutboundTextMessage,
  ): Promise<{ ok: true } | { ok: false; reason: string }> {
    const token = getWhatsAppAccessToken();
    const phoneNumberId = getWhatsAppPhoneNumberId();
    if (!token || !phoneNumberId) {
      return { ok: false, reason: "whatsapp_not_configured" };
    }

    const url = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${phoneNumberId}/messages`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: message.externalUserId,
          type: "text",
          text: { body: message.text },
        }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.error("whatsapp_send_failed", res.status, errText.slice(0, 200));
        return { ok: false, reason: "send_failed" };
      }
      return { ok: true };
    } catch {
      return { ok: false, reason: "network_error" };
    }
  }
}
