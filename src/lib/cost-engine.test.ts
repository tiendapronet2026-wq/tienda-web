import { describe, expect, it } from "vitest";
import {
  applyMargin,
  applyWaste,
  calculateMaterialCost,
  calculateProcessResourceCostPerUnit,
  calculateProductMaterialCost,
  calculateProductProductionCostFromParts,
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

describe("cost-engine / Gate 2 BOM roll-up", () => {
  it("suma cantidad × costo unitario por línea", () => {
    const total = calculateProductMaterialCost([
      { quantity: 100, unitCost: 20 },
      { quantity: 2, unitCost: 300 },
    ]);
    expect(total).toBe(2600);
  });

  it("rechaza cantidades o costos inválidos", () => {
    expect(() => calculateProductMaterialCost([{ quantity: 0, unitCost: 10 }])).toThrow();
    expect(() => calculateProductMaterialCost([{ quantity: 1, unitCost: -1 }])).toThrow();
  });
});

describe("cost-engine / Gate 2B procesos", () => {
  it("caso A — sólo máquina run 30 min @ 1200/h", () => {
    expect(calculateProcessResourceCostPerUnit(1200, 30, 0, 1)).toBe(600);
  });

  it("caso B — sólo MO run 15 min @ 2000/h", () => {
    expect(calculateProcessResourceCostPerUnit(2000, 15, 0, 1)).toBe(500);
  });

  it("caso C — máquina + MO en pasos separados (suma manual)", () => {
    const machine = calculateProcessResourceCostPerUnit(1200, 30, 0, 1);
    const labor = calculateProcessResourceCostPerUnit(2000, 15, 0, 1);
    expect(machine + labor).toBe(1100);
  });

  it("caso D — setup amortizado por lote 100", () => {
    expect(calculateProcessResourceCostPerUnit(1200, 0, 30, 100)).toBe(6);
  });

  it("caso E — roll-up completo desde partes", () => {
    const b = calculateProductProductionCostFromParts(3100, 600, 500);
    expect(b.productionCost).toBe(1100);
    expect(b.totalCost).toBe(4200);
  });

  it("caso I — tiempos y lote inválidos", () => {
    expect(() => calculateProcessResourceCostPerUnit(100, 0, 0, 1)).toThrow();
    expect(() => calculateProcessResourceCostPerUnit(100, 10, 0, 0)).toThrow();
    expect(() => calculateProcessResourceCostPerUnit(100, -1, 0, 1)).toThrow();
  });

  it("permite sólo setup con run 0", () => {
    expect(calculateProcessResourceCostPerUnit(1200, 0, 60, 1)).toBe(1200);
  });
});
