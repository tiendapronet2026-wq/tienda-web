import { describe, expect, it } from "vitest";
import { computeOrderTotals } from "@/lib/checkout/place-order";

describe("computeOrderTotals", () => {
  it("calcula subtotal y valida stock", () => {
    const { subtotal, total } = computeOrderTotals([
      {
        id: "1",
        quantity: 2,
        products: {
          id: "p1",
          name: "Test",
          sku: null,
          price: 100,
          stock: 5,
          track_stock: true,
          is_active: true,
        },
      },
    ]);
    expect(subtotal).toBe(200);
    expect(total).toBe(200);
  });

  it("rechaza stock insuficiente", () => {
    expect(() =>
      computeOrderTotals([
        {
          id: "1",
          quantity: 10,
          products: {
            id: "p1",
            name: "Test",
            sku: null,
            price: 10,
            stock: 1,
            track_stock: true,
            is_active: true,
          },
        },
      ])
    ).toThrow(/Stock insuficiente/);
  });
});
