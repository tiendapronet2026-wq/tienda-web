import { describe, expect, it } from "vitest";
import {
  applyMargin,
  applyWaste,
  calculateMaterialCost,
  deriveUnitCostFromPurchase,
  roundCurrency,
} from "@/lib/cost-engine";

describe("cost-engine / Gate 1 unidades", () => {
  it("resma: precio / hojas por resma", () => {
    expect(deriveUnitCostFromPurchase(10_000, 500)).toBe(20);
  });

  it("filamento: precio por kg / gramos por kg", () => {
    expect(deriveUnitCostFromPurchase(20_000, 1000)).toBe(20);
  });

  it("rechaza división inválida", () => {
    expect(() => deriveUnitCostFromPurchase(100, 0)).toThrow();
    expect(() => deriveUnitCostFromPurchase(-1, 10)).toThrow();
  });

  it("material cost y márgenes deterministas", () => {
    const base = calculateMaterialCost(20, 250);
    expect(base).toBe(5000);
    expect(applyWaste(base, 10)).toBe(5500);
    expect(roundCurrency(applyMargin(100, 25))).toBe(125);
  });
});
