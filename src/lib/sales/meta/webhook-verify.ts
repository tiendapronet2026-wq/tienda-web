import { getMetaMessengerVerifyToken } from "./config";
import { getWhatsAppWebhookVerifyToken } from "./whatsapp-config";

export function verifyMetaWebhookSubscription(query: {
  mode: string | null;
  token: string | null;
  challenge: string | null;
}): { ok: true; challenge: string } | { ok: false } {
  if (query.mode !== "subscribe" || !query.challenge) {
    return { ok: false };
  }
  const candidates = [getMetaMessengerVerifyToken(), getWhatsAppWebhookVerifyToken()].filter(
    (t): t is string => Boolean(t),
  );
  if (!candidates.length || !query.token || !candidates.includes(query.token)) {
    return { ok: false };
  }
  return { ok: true, challenge: query.challenge };
}
