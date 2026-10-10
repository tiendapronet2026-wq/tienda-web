import { describe, expect, it } from "vitest";
import {
  isMercadoPagoOrderAccredited,
  validateMercadoPagoOrderAgainstInternal,
} from "./order-fulfillment";

describe("mercadopago order fulfillment validation", () => {
  it("only accredits processed/accredited", () => {
    expect(isMercadoPagoOrderAccredited({ status: "processed", statusDetail: "accredited" } as never)).toBe(
      true,
    );
    expect(isMercadoPagoOrderAccredited({ status: "pending", statusDetail: "pending" } as never)).toBe(
      false,
    );
  });

  it("rejects external_reference mismatch", () => {
    const r = validateMercadoPagoOrderAgainstInternal({
      mpOrder: {
        id: "ORD1",
        externalReference: "other",
        status: "processed",
        statusDetail: "accredited",
        totalAmount: "100.00",
        currency: "ARS",
        userId: 1,
      },
      internalOrderId: "uuid-1",
      expectedTotal: 100,
      expectedCurrency: "ARS",
      expectedMpUserId: "1",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("external_reference_mismatch");
  });

  it("rejects amount mismatch", () => {
    const r = validateMercadoPagoOrderAgainstInternal({
      mpOrder: {
        id: "ORD1",
        externalReference: "uuid-1",
        status: "processed",
        statusDetail: "accredited",
        totalAmount: "50.00",
        currency: "ARS",
        userId: 1,
      },
      internalOrderId: "uuid-1",
      expectedTotal: 100,
      expectedCurrency: "ARS",
      expectedMpUserId: "1",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("amount_mismatch");
  });
});
