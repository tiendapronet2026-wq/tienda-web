import { timingSafeEqual } from "node:crypto";

/** Mínimo de caracteres del secret (sin exponer el valor). */
export const BRIDGE_API_SECRET_MIN_LENGTH = 24;

export type BridgeApiConfigStatus = "ok" | "missing" | "too_short";

export function getBridgeApiConfigStatus(): BridgeApiConfigStatus {
  const secret = process.env.BRIDGE_API_SECRET?.trim();
  if (!secret) return "missing";
  if (secret.length < BRIDGE_API_SECRET_MIN_LENGTH) return "too_short";
  return "ok";
}

export function isBridgeApiConfigured(): boolean {
  return getBridgeApiConfigStatus() === "ok";
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
