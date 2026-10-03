import { describe, expect, it } from "vitest";
import { reloadCartLinesFromCatalog } from "./cart-catalog";

describe("reloadCartLinesFromCatalog", () => {
  it("reemplaza precio del cliente por catálogo", async () => {
    const admin = {
      from: () => ({
        select: () => ({
          in: async () => ({
            data: [
              {
                id: "p1",
                name: "Pack",
                sku: null,
                price: 29999,
                stock: 0,
                track_stock: false,
                is_active: true,
                fulfillment_type: "digital",
              },
            ],
            error: null,
          }),
        }),
      }),
    };

    const lines = await reloadCartLinesFromCatalog(admin as never, [
      {
        id: "c1",
        quantity: 1,
        products: {
          id: "p1",
          name: "Pack",
          sku: null,
          price: 1,
          stock: 0,
          track_stock: false,
          is_active: true,
          fulfillment_type: "digital",
        },
      },
    ]);

    expect(lines[0].products?.price).toBe(29999);
  });
});
