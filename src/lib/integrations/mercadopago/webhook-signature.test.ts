import { describe, expect, it } from "vitest";
import {
  buildMercadoPagoWebhookManifest,
  verifyMercadoPagoWebhookSignature,
} from "./webhook-signature";
import { createHmac } from "node:crypto";

describe("mercadopago webhook signature", () => {
  const secret = "test-webhook-secret";

  function sign(manifest: string) {
    return createHmac("sha256", secret).update(manifest).digest("hex");
  }

  it("builds manifest with lowercase data.id", () => {
    expect(
      buildMercadoPagoWebhookManifest({
        dataId: "ORD01ABC",
        xRequestId: "req-1",
        ts: "123",
      }),
    ).toBe("id:ord01abc;request-id:req-1;ts:123;");
  });

  it("rejects invalid signature", () => {
    const ok = verifyMercadoPagoWebhookSignature({
      xSignature: "ts=123,v1=deadbeef",
      xRequestId: "req-1",
      dataId: "ord01",
      secret,
    });
    expect(ok).toBe(false);
  });

  it("accepts valid signature", () => {
    const manifest = buildMercadoPagoWebhookManifest({
      dataId: "ord01",
      xRequestId: "req-1",
      ts: "999",
    });
    const v1 = sign(manifest);
    const ok = verifyMercadoPagoWebhookSignature({
      xSignature: `ts=999,v1=${v1}`,
      xRequestId: "req-1",
      dataId: "ord01",
      secret,
    });
    expect(ok).toBe(true);
  });
});
