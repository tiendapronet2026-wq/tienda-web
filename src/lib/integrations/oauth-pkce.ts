import { createHash, randomBytes } from "node:crypto";

const VERIFIER_BYTES = 32;

/** PKCE code_verifier: 43–128 chars URL-safe (MP OAuth). */
export function generatePkceVerifier(): string {
  return randomBytes(VERIFIER_BYTES).toString("base64url");
}

export function pkceChallengeS256(verifier: string): string {
  return createHash("sha256").update(verifier, "utf8").digest("base64url");
}

export function generateOAuthState(): string {
  return randomBytes(24).toString("base64url");
}
