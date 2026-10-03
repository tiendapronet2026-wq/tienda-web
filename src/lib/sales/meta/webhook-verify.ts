import { getMetaMessengerVerifyToken } from "./config";

export function verifyMetaWebhookSubscription(query: {
  mode: string | null;
  token: string | null;
  challenge: string | null;
}): { ok: true; challenge: string } | { ok: false } {
  if (query.mode !== "subscribe" || !query.challenge) {
    return { ok: false };
  }
  const expected = getMetaMessengerVerifyToken();
  if (!expected || !query.token || query.token !== expected) {
    return { ok: false };
  }
  return { ok: true, challenge: query.challenge };
}
