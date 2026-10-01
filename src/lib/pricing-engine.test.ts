import { describe, expect, it } from "vitest";
import {
  analyzeProductPricing,
  calculateMarginOnSale,
  calculateMarkupOnCost,
  calculateSuggestedPrice,
  metricsFromAdoptedFinalPrice,
  netPriceFromTargetMarginOnSale,
  percentToFraction,
  roundSuggestedPrice,
  validateTargetMarginOnSale,
} from "./pricing-engine";

describe("Gate 3A pricing", () => {
  it("A — markup sobre costo", () => {
    expect(calculateMarkupOnCost(100, 150)).toBeCloseTo(0.5, 6);
  });

  it("B — margen sobre venta", () => {
    expect(calculateMarginOnSale(100, 150)).toBeCloseTo(1 / 3, 4);
  });

  it("C — precio por margen sobre venta (no markup)", () => {
    expect(netPriceFromTargetMarginOnSale(100, 0.4)).toBeCloseTo(166.67, 2);
    expect(netPriceFromTargetMarginOnSale(100, 0.4)).not.toBeCloseTo(140, 0);
  });

  it("D — margen 0 %", () => {
    expect(netPriceFromTargetMarginOnSale(100, 0)).toBe(100);
  });

  it("E — margen objetivo inválido", () => {
    expect(() => validateTargetMarginOnSale(1)).toThrow();
    expect(() => validateTargetMarginOnSale(1.2)).toThrow();
    expect(() => validateTargetMarginOnSale(-0.01)).toThrow();
  });

  it("F — precio por debajo del costo", () => {
    const a = analyzeProductPricing({
      productionCost: 100,
      currentSalePrice: 80,
      targetMarginOnSale: 0.2,
      taxRateOnNet: 0,
      roundingRule: "none",
    });
    expect(a.below_cost).toBe(true);
    expect(a.actual_margin_on_sale).toBeLessThan(0);
    expect(a.unit_result).toBe(-20);
  });

  it("G — impuesto sobre neto", () => {
    const r = calculateSuggestedPrice({
      productionCost: 0,
      targetMarginOnSale: 0,
      taxRateOnNet: 0.21,
      roundingRule: "none",
    });
    const base = calculateSuggestedPrice({
      productionCost: 100,
      targetMarginOnSale: 0,
      taxRateOnNet: 0.21,
      roundingRule: "none",
    });
    expect(base.net_price).toBe(100);
    expect(base.tax_amount).toBeCloseTo(21, 2);
    expect(base.suggested_price).toBeCloseTo(121, 2);
    expect(r.net_price).toBe(0);
  });

  it("H — cambio de costo recalcula sugerido", () => {
    const low = calculateSuggestedPrice({
      productionCost: 100,
      targetMarginOnSale: 0.25,
      taxRateOnNet: 0,
      roundingRule: "none",
    });
    const high = calculateSuggestedPrice({
      productionCost: 120,
      targetMarginOnSale: 0.25,
      taxRateOnNet: 0,
      roundingRule: "none",
    });
    expect(high.suggested_price).toBeGreaterThan(low.suggested_price);
    expect(high.net_price).toBeCloseTo(160, 2);
  });

  it("redondeo determinista", () => {
    expect(roundSuggestedPrice(166.67, "integer")).toBe(167);
    expect(roundSuggestedPrice(166.67, "ten")).toBe(170);
    expect(roundSuggestedPrice(166.67, "hundred")).toBe(200);
  });

  it("percentToFraction", () => {
    expect(percentToFraction(21)).toBeCloseTo(0.21, 6);
  });

  it("J — precio actual = precio sugerido → margen actual ≈ objetivo (tax 0)", () => {
    const target = 0.4;
    const suggested = calculateSuggestedPrice({
      productionCost: 100,
      targetMarginOnSale: target,
      taxRateOnNet: 0,
      roundingRule: "none",
    });
    const analysis = analyzeProductPricing({
      productionCost: 100,
      currentSalePrice: suggested.suggested_price,
      targetMarginOnSale: target,
      taxRateOnNet: 0,
      roundingRule: "none",
    });
    expect(analysis.actual_margin_on_sale).toBeCloseTo(target, 3);
  });

  it("Gate 3B A — adopción precio 200 con costo 100 (margen sobre neto)", () => {
    const m = metricsFromAdoptedFinalPrice(100, 200, 0);
    expect(m.actual_margin_on_sale).toBeCloseTo(0.5, 4);
  });

  it("Gate 3B C — precio manual distinto del sugerido", () => {
    const m = metricsFromAdoptedFinalPrice(100, 190, 0);
    expect(m.actual_margin_on_sale).toBeCloseTo((190 - 100) / 190, 4);
  });

  it("Gate 3B G — margen con precio final e impuesto", () => {
    const tax = 0.21;
    const suggested = calculateSuggestedPrice({
      productionCost: 100,
      targetMarginOnSale: 0.4,
      taxRateOnNet: tax,
      roundingRule: "none",
    });
    const m = metricsFromAdoptedFinalPrice(100, suggested.suggested_price, tax);
    expect(m.actual_margin_on_sale).toBeCloseTo(0.4, 2);
  });

  it("J — precio actual = precio sugerido → margen actual ≈ objetivo (tax 21 %)", () => {
    const target = 0.4;
    const tax = 0.21;
    const suggested = calculateSuggestedPrice({
      productionCost: 100,
      targetMarginOnSale: target,
      taxRateOnNet: tax,
      roundingRule: "none",
    });
    const analysis = analyzeProductPricing({
      productionCost: 100,
      currentSalePrice: suggested.suggested_price,
      targetMarginOnSale: target,
      taxRateOnNet: tax,
      roundingRule: "none",
    });
    expect(analysis.actual_margin_on_sale).toBeCloseTo(target, 2);
    expect(analysis.current_net_sale_price).toBeCloseTo(suggested.net_price, 2);
  });
});
