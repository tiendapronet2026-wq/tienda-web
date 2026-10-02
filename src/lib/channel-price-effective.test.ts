import { describe, expect, it } from "vitest";
import { effectiveChannelFinalPrice } from "./channel-price-effective";

describe("Gate 3E effective channel price", () => {
  it("C — fallback usa precio general", () => {
    const r = effectiveChannelFinalPrice(10_000, null);
    expect(r.price).toBe(10_000);
    expect(r.usesCatalog).toBe(true);
  });

  it("override activo", () => {
    const r = effectiveChannelFinalPrice(10_000, { final_price: 11_500, is_active: true });
    expect(r.price).toBe(11_500);
    expect(r.usesCatalog).toBe(false);
  });

  it("D — override inactivo vuelve al general", () => {
    const r = effectiveChannelFinalPrice(10_000, { final_price: 11_500, is_active: false });
    expect(r.price).toBe(10_000);
    expect(r.usesCatalog).toBe(true);
  });
});
