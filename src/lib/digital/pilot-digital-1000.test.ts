import { describe, expect, it, vi } from "vitest";
import {
  assertPilotDigital1000CheckoutAllowed,
  cartContainsPilotDigital1000,
  isPilotDigital1000Enabled,
} from "@/lib/digital/pilot-digital-1000";
import { PILOT_DIGITAL_1000_SKU } from "@/lib/digital/constants";

describe("pilot digital 1000", () => {
  it("flag desactivado por defecto en producción", () => {
    vi.stubEnv("TIENDAPRO_PILOT_DIGITAL_1000_ENABLED", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(isPilotDigital1000Enabled()).toBe(false);
  });

  it("rechaza carrito piloto mezclado", () => {
    vi.stubEnv("TIENDAPRO_PILOT_DIGITAL_1000_ENABLED", "1");
    const lines = [
      {
        id: "1",
        quantity: 1,
        products: {
          id: "p1",
          name: "Piloto",
          sku: PILOT_DIGITAL_1000_SKU,
          price: 1000,
          stock: 0,
          track_stock: false,
          is_active: true,
          fulfillment_type: "digital",
        },
      },
      {
        id: "2",
        quantity: 1,
        products: {
          id: "p2",
          name: "Otro",
          sku: "X",
          price: 10,
          stock: 1,
          track_stock: true,
          is_active: true,
          fulfillment_type: "physical",
        },
      },
    ];
    expect(cartContainsPilotDigital1000(lines)).toBe(true);
    expect(() => assertPilotDigital1000CheckoutAllowed(lines)).toThrow(/sin otros productos/i);
  });

  it("rechaza precio manipulado en servidor", () => {
    vi.stubEnv("TIENDAPRO_PILOT_DIGITAL_1000_ENABLED", "1");
    expect(() =>
      assertPilotDigital1000CheckoutAllowed([
        {
          id: "1",
          quantity: 1,
          products: {
            id: "p1",
            name: "Piloto",
            sku: PILOT_DIGITAL_1000_SKU,
            price: 1,
            stock: 0,
            track_stock: false,
            is_active: true,
            fulfillment_type: "digital",
          },
        },
      ]),
    ).toThrow(/precio/i);
  });
});
