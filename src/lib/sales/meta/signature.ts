import { createHmac, timingSafeEqual } from "node:crypto";

/** Valida X-Hub-Signature-256 (sha256=...) antes de procesar el body. */
export function verifyMetaWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string,
): boolean {
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expectedHex = signatureHeader.slice("sha256=".length);
  if (!expectedHex) return false;

  const digest = createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  try {
    const a = Buffer.from(digest, "utf8");
    const b = Buffer.from(expectedHex, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
