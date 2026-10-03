import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { verifyMetaWebhookSignature } from "./signature";

describe("verifyMetaWebhookSignature", () => {
  const secret = "test-app-secret";
  const body = '{"object":"page"}';

  it("acepta firma correcta", () => {
    const digest = createHmac("sha256", secret).update(body, "utf8").digest("hex");
    expect(verifyMetaWebhookSignature(body, `sha256=${digest}`, secret)).toBe(true);
  });

  it("rechaza firma incorrecta", () => {
    expect(verifyMetaWebhookSignature(body, "sha256=deadbeef", secret)).toBe(false);
  });

  it("rechaza firma ausente", () => {
    expect(verifyMetaWebhookSignature(body, null, secret)).toBe(false);
  });
});
