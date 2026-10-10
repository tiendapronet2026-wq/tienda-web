import { describe, expect, it, vi } from "vitest";
import { handleApprovedOrder } from "./handle-approved-order";

describe("handleApprovedOrder", () => {
  it("propaga rechazo del RPC", async () => {
    const admin = {
      rpc: vi.fn().mockResolvedValue({
        data: { ok: false, reason: "order_not_approved" },
        error: null,
      }),
    };
    const r = await handleApprovedOrder(admin as never, "o1");
    expect(r).toEqual({ ok: false, reason: "order_not_approved" });
  });

  function adminWithAttributionStub() {
    return {
      rpc: vi.fn().mockResolvedValue({
        data: { ok: true, entitlementsCreated: 1, entitlementsActivated: 1 },
        error: null,
      }),
      from: vi.fn(() => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { notes: null }, error: null }),
          }),
        }),
        update: () => ({
          eq: () => ({
            eq: async () => ({ error: null }),
          }),
        }),
      })),
    };
  }

  it("mapea entrega exitosa", async () => {
    const admin = adminWithAttributionStub();
    const r = await handleApprovedOrder(admin as never, "o1");
    expect(r).toEqual({ ok: true, entitlementsCreated: 1, entitlementsActivated: 1 });
    expect(admin.rpc).toHaveBeenCalledWith("grant_digital_entitlements_for_paid_order", {
      p_order_id: "o1",
    });
  });

  it("segunda invocación idempotente (mismo resultado RPC)", async () => {
    const admin = adminWithAttributionStub();
    await handleApprovedOrder(admin as never, "o1");
    await handleApprovedOrder(admin as never, "o1");
    expect(admin.rpc).toHaveBeenCalledTimes(2);
  });
});
