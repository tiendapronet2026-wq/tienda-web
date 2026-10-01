import { describe, expect, it } from "vitest";
import {
  breakEvenFinalPrice,
  calculateChannelProfitability,
  type ChannelCostProfileInput,
} from "./channel-profitability-engine";

const zeroProfile: ChannelCostProfileInput = {
  channel_fee_percent: 0,
  payment_fee_percent: 0,
  fixed_fee_per_order: 0,
  shipping_absorbed_per_order: 0,
  other_cost_per_order: 0,
  default_units_per_order: 1,
};

function run(
  finalPrice: number,
  productionCost: number,
  profile: ChannelCostProfileInput,
  opts?: { tax?: number; units?: number; override?: number; catalog?: number },
) {
  return calculateChannelProfitability({
    catalogFinalPrice: opts?.catalog ?? finalPrice,
    finalPriceOverride: opts?.override ?? null,
    taxRatePercent: opts?.tax ?? 0,
    productionCost,
    profile,
    unitsPerOrder: opts?.units ?? null,
  });
}

describe("Gate 3C channel profitability", () => {
  it("A — canal sin costos", () => {
    const r = run(10_000, 4_200, zeroProfile);
    expect(r.unit_contribution).toBe(5_800);
    expect(r.channel_cost_per_unit).toBe(0);
  });

  it("B — comisión canal 8 %", () => {
    const r = run(10_000, 4_200, { ...zeroProfile, channel_fee_percent: 8 });
    expect(r.channel_fee).toBe(800);
    expect(r.unit_contribution).toBe(5_000);
  });

  it("C — canal + cobro", () => {
    const r = run(10_000, 4_200, {
      ...zeroProfile,
      channel_fee_percent: 8,
      payment_fee_percent: 3,
    });
    expect(r.channel_fee).toBe(800);
    expect(r.payment_fee).toBe(300);
    expect(r.unit_contribution).toBe(4_700);
  });

  it("D — envío absorbido por pedido", () => {
    const r = run(10_000, 4_200, {
      ...zeroProfile,
      channel_fee_percent: 8,
      payment_fee_percent: 3,
      shipping_absorbed_per_order: 500,
    });
    expect(r.unit_contribution).toBe(4_200);
  });

  it("E — amortización shipping / unidades", () => {
    const r = run(
      10_000,
      4_200,
      {
        ...zeroProfile,
        channel_fee_percent: 8,
        payment_fee_percent: 3,
        shipping_absorbed_per_order: 600,
      },
      { units: 3 },
    );
    expect(r.shipping_unit).toBeCloseTo(200, 4);
    expect(r.unit_contribution).toBeCloseTo(4_500, 2);
  });

  it("F — impuesto referencia 21 %", () => {
    const r = run(12_100, 4_200, zeroProfile, { tax: 21 });
    expect(r.net_sales_revenue).toBe(10_000);
    expect(r.unit_contribution).toBe(5_800);
  });

  it("G — precio override sin tocar catálogo", () => {
    const r = run(10_000, 4_200, zeroProfile, { override: 9_000, catalog: 10_000 });
    expect(r.final_price).toBe(9_000);
    expect(r.catalog_final_price).toBe(10_000);
    expect(r.unit_contribution).toBe(4_800);
  });

  it("H — costo producción más alto reduce contribución", () => {
    const a = run(10_000, 4_200, zeroProfile);
    const b = run(10_000, 4_500, zeroProfile);
    expect(b.unit_contribution).toBe(a.unit_contribution - 300);
  });

  it("I — break-even determinista", () => {
    const be = breakEvenFinalPrice(100, 0, 0, 0, 0);
    expect(be.viable).toBe(true);
    expect(be.price).toBe(100);

    const be2 = breakEvenFinalPrice(4_200, 0, 0.08, 0.03, 0);
    expect(be2.viable).toBe(true);
    expect(be2.price).toBeCloseTo(4_200 / 0.89, 2);
  });

  it("J — units_per_order inválido", () => {
    expect(() => run(10_000, 100, zeroProfile, { units: 0 })).toThrow();
    expect(() => run(10_000, 100, zeroProfile, { units: -1 })).toThrow();
  });

  it("K — fees inválidos", () => {
    expect(() =>
      run(10_000, 100, { ...zeroProfile, channel_fee_percent: -1 }),
    ).toThrow();
    expect(() =>
      run(10_000, 100, { ...zeroProfile, payment_fee_percent: 100 }),
    ).toThrow();
  });

  it("break-even inviable si fees superan neto", () => {
    const be = breakEvenFinalPrice(100, 0, 0.6, 0.5, 0);
    expect(be.viable).toBe(false);
    expect(be.price).toBeNull();
  });
});
