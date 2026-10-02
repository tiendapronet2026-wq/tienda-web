import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  decryptCredentialPayload,
  encryptCredentialPayload,
  stripSecretsFromObject,
} from "./credentials";

describe("Gate 3F credentials", () => {
  const prev = process.env.INTEGRATION_CREDENTIALS_KEY;

  beforeEach(() => {
    process.env.INTEGRATION_CREDENTIALS_KEY = "test-integration-key-32chars-minimum!!";
  });

  afterEach(() => {
    process.env.INTEGRATION_CREDENTIALS_KEY = prev;
  });

  it("cifra y descifra roundtrip", () => {
    const plain = JSON.stringify({ type: "demo", access_token: "hidden" });
    const { ciphertext } = encryptCredentialPayload(plain);
    expect(decryptCredentialPayload(ciphertext)).toBe(plain);
  });

  it("stripSecretsFromObject elimina campos sensibles", () => {
    const safe = stripSecretsFromObject({
      provider: "link_demo",
      access_token: "x",
      connectionId: "uuid",
    });
    expect(safe).toEqual({ provider: "link_demo", connectionId: "uuid" });
  });
});
