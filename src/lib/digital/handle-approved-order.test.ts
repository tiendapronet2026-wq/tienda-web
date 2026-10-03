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

  it("mapea entrega exitosa", async () => {
    const admin = {
      rpc: vi.fn().mockResolvedValue({
        data: { ok: true, entitlementsCreated: 1, entitlementsActivated: 1 },
        error: null,
      }),
    };
    const r = await handleApprovedOrder(admin as never, "o1");
    expect(r).toEqual({ ok: true, entitlementsCreated: 1, entitlementsActivated: 1 });
    expect(admin.rpc).toHaveBeenCalledWith("grant_digital_entitlements_for_paid_order", {
      p_order_id: "o1",
    });
  });

  it("segunda invocación idempotente (mismo resultado RPC)", async () => {
    const admin = {
      rpc: vi.fn().mockResolvedValue({
        data: { ok: true, entitlementsCreated: 1, entitlementsActivated: 1 },
        error: null,
      }),
    };
    await handleApprovedOrder(admin as never, "o1");
    await handleApprovedOrder(admin as never, "o1");
    expect(admin.rpc).toHaveBeenCalledTimes(2);
  });
});
