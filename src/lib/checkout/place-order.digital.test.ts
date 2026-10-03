import { describe, expect, it } from "vitest";
import { cartFulfillmentMode, cartRequiresShipping, computeOrderTotals } from "./place-order";

const digitalLine = {
  id: "1",
  quantity: 1,
  products: {
    id: "p1",
    name: "Pack digital",
    sku: null,
    price: 100,
    stock: 0,
    track_stock: false,
    is_active: true,
    fulfillment_type: "digital",
  },
};

const physicalLine = {
  id: "2",
  quantity: 1,
  products: {
    id: "p2",
    name: "Físico",
    sku: null,
    price: 50,
    stock: 5,
    track_stock: true,
    is_active: true,
    fulfillment_type: "physical",
  },
};

describe("checkout digital vs físico", () => {
  it("digital checkout no exige shipping", () => {
    expect(cartRequiresShipping([digitalLine])).toBe(false);
    expect(cartFulfillmentMode([digitalLine])).toBe("digital");
  });

  it("physical checkout sigue exigiendo shipping", () => {
    expect(cartRequiresShipping([physicalLine])).toBe(true);
    expect(cartFulfillmentMode([physicalLine])).toBe("physical");
  });

  it("mixed mantiene shipping", () => {
    expect(cartRequiresShipping([digitalLine, physicalLine])).toBe(true);
    expect(cartFulfillmentMode([digitalLine, physicalLine])).toBe("mixed");
  });

  it("precio se calcula desde líneas de catálogo", () => {
    const { total } = computeOrderTotals([digitalLine]);
    expect(total).toBe(100);
  });

  it("pack inactive no puede calcularse", () => {
    expect(() =>
      computeOrderTotals([
        {
          ...digitalLine,
          products: { ...digitalLine.products!, is_active: false },
        },
      ]),
    ).toThrow(/no disponible/);
  });
});
