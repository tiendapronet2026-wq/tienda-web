import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const ALGO = "aes-256-gcm";
const KEY_VERSION = 1;

function deriveKey(secret: string): Buffer {
  return scryptSync(secret, "tiendapro-integration-v1", 32);
}

export function getCredentialsKey(): string {
  const key = process.env.INTEGRATION_CREDENTIALS_KEY?.trim();
  if (!key || key.length < 32) {
    throw new Error("INTEGRATION_CREDENTIALS_KEY no configurada o demasiado corta (mín. 32 caracteres).");
  }
  return key;
}

export function encryptCredentialPayload(plaintext: string): { ciphertext: string; keyVersion: number } {
  const key = deriveKey(getCredentialsKey());
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const packed = Buffer.concat([iv, tag, enc]).toString("base64");
  return { ciphertext: packed, keyVersion: KEY_VERSION };
}

export function decryptCredentialPayload(ciphertext: string): string {
  const key = deriveKey(getCredentialsKey());
  const raw = Buffer.from(ciphertext, "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const data = raw.subarray(28);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

/** Respuestas API nunca deben incluir campos de credencial. */
export function stripSecretsFromObject<T extends Record<string, unknown>>(obj: T): T {
  const clone = { ...obj };
  for (const k of Object.keys(clone)) {
    const lower = k.toLowerCase();
    if (
      lower.includes("secret") ||
      lower.includes("token") ||
      lower.includes("credential") ||
      lower.includes("ciphertext") ||
      lower === "password"
    ) {
      delete clone[k];
    }
  }
  return clone;
}
