import { describe, expect, it, vi } from "vitest";
import {
  ensureSmokeMpMonetaryOrder,
  findReusablePendingSmokeMpOrder,
} from "@/lib/digital/pack150-mp-smoke";

describe("pack150 mp smoke order idempotency", () => {
  it("reutiliza pedido smoke pending sin mp_order_id", async () => {
    const admin = {
      from: vi.fn((table: string) => {
        if (table === "orders") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  is: () => ({
                    ilike: () => ({
                      order: () => ({
                        limit: async () => ({
                          data: [
                            {
                              id: "order-reuse-1",
                              total: 1000,
                              currency: "ARS",
                            },
                          ],
                          error: null,
                        }),
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

    const found = await findReusablePendingSmokeMpOrder(admin as never, "user-1");
    expect(found).toEqual({ orderId: "order-reuse-1", total: 1000, currency: "ARS" });

    const ensured = await ensureSmokeMpMonetaryOrder({
      admin: admin as never,
      buyerUserId: "user-1",
    });
    expect(ensured.reused).toBe(true);
    expect(ensured.orderId).toBe("order-reuse-1");
  });
});
