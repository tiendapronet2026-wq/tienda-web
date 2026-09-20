import { timingSafeEqual } from "node:crypto";

export function isBridgeApiConfigured(): boolean {
  const secret = process.env.BRIDGE_API_SECRET?.trim();
  return Boolean(secret && secret.length >= 24);
}

export function verifyBridgeApiSecret(provided: string | null | undefined): boolean {
  const expected = process.env.BRIDGE_API_SECRET?.trim();
  if (!expected || !provided) return false;
  if (expected.length !== provided.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
  } catch {
    return false;
  }
}

export function getBridgeApiAuthHeader(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  return request.headers.get("x-bridge-api-secret")?.trim() ?? null;
}
