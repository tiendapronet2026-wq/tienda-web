import { describe, expect, it, vi } from "vitest";
import { handleApprovedOrder } from "@/lib/digital/handle-approved-order";
import { resolveDigitalAccessForEntitlement } from "@/lib/digital/access";
import { buildGoogleDriveFolderAccessUrl } from "@/lib/digital/access";

const DRIVE_ID = "folder-smoke-alias-test";

describe("mp monetary smoke fulfillment", () => {
  it("grants one entitlement per paid order (RPC idempotente)", async () => {
    const admin = {
      rpc: vi.fn().mockResolvedValue({
        data: { ok: true, entitlementsCreated: 1, entitlementsActivated: 1 },
        error: null,
      }),
      from: vi.fn((table: string) => {
        if (table === "orders") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { notes: null }, error: null }),
              }),
            }),
          };
        }
        if (table === "sales_conversations") {
          return {
            update: () => ({
              eq: () => ({
                eq: async () => ({ error: null }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    };
    await handleApprovedOrder(admin as never, "order-1");
    await handleApprovedOrder(admin as never, "order-1");
    expect(admin.rpc).toHaveBeenCalledTimes(2);
    expect(admin.rpc).toHaveBeenCalledWith("grant_digital_entitlements_for_paid_order", {
      p_order_id: "order-1",
    });
  });

  it("smoke product delivery resolves to same Drive folder as alias resource", async () => {
    const admin = {
      from: vi.fn((table: string) => {
        if (table === "digital_entitlements") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: "ent-1",
                    status: "active",
                    product_id: "smoke-product-id",
                    user_id: "user-1",
                  },
                }),
              }),
            }),
          };
        }
        if (table === "digital_delivery_resources") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  order: () => ({
                    limit: () => ({
                      maybeSingle: async () => ({
                        data: {
                          label: "Smoke MP alias",
                          external_resource_id: DRIVE_ID,
                          active: true,
                          provider: "google_drive",
                        },
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    };

    const result = await resolveDigitalAccessForEntitlement(admin as never, "ent-1", "user-1");
    expect(result).toEqual({
      ok: true,
      label: "Smoke MP alias",
      accessUrl: buildGoogleDriveFolderAccessUrl(DRIVE_ID),
    });
  });
});
