import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** Token opaco para URL /connect/<token> (nunca secretos de proveedor). */
export function generateLinkToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashLinkToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function buildConnectUrl(siteUrl: string, token: string): string {
  const base = siteUrl.replace(/\/$/, "");
  return `${base}/connect/${encodeURIComponent(token)}`;
}

/** QR debe contener solo la URL temporal, sin credenciales embebidas. */
export function assertQrPayloadIsSafeUrl(url: string): void {
  const lower = url.toLowerCase();
  for (const forbidden of ["access_token", "refresh_token", "client_secret", "api_key", "bearer"]) {
    if (lower.includes(forbidden)) {
      throw new Error("QR payload no puede contener secretos");
    }
  }
}

export function tokensEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}
