import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { verifyMetaWebhookSubscription } from "./webhook-verify";

describe("verifyMetaWebhookSubscription", () => {
  const prev = process.env.META_MESSENGER_VERIFY_TOKEN;

  beforeEach(() => {
    process.env.META_MESSENGER_VERIFY_TOKEN = "verify-token-test";
  });

  afterEach(() => {
    process.env.META_MESSENGER_VERIFY_TOKEN = prev;
  });

  it("GET verify correcto", () => {
    const r = verifyMetaWebhookSubscription({
      mode: "subscribe",
      token: "verify-token-test",
      challenge: "12345",
    });
    expect(r).toEqual({ ok: true, challenge: "12345" });
  });

  it("verify token incorrecto rechazado", () => {
    const r = verifyMetaWebhookSubscription({
      mode: "subscribe",
      token: "wrong",
      challenge: "12345",
    });
    expect(r).toEqual({ ok: false });
  });
});
