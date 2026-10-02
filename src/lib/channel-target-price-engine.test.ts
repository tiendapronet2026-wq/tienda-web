import { describe, expect, it } from "vitest";
import {
  calculateChannelProfitability,
  calculateRequiredChannelPrice,
  rawRequiredFinalPriceForChannelMargin,
  type ChannelCostProfileInput,
} from "./channel-profitability-engine";

const baseProfile: ChannelCostProfileInput = {
  channel_fee_percent: 0,
  payment_fee_percent: 0,
  fixed_fee_per_order: 0,
  shipping_absorbed_per_order: 0,
  other_cost_per_order: 0,
  default_units_per_order: 1,
};

function required(
  cost: number,
  marginPct: number,
  profile: ChannelCostProfileInput = baseProfile,
  opts?: { tax?: number; units?: number; catalog?: number; rounding?: "none" | "integer" },
) {
  return calculateRequiredChannelPrice({
    productionCost: cost,
    catalogFinalPrice: opts?.catalog ?? 10_000,
    taxRatePercent: opts?.tax ?? 0,
    profile,
    unitsPerOrder: opts?.units ?? null,
    targetChannelMarginPercent: marginPct,
    roundingRule: opts?.rounding ?? "none",
  });
}

describe("Gate 3D channel target price", () => {
  it("A — sin fees/tax, target 40 %", () => {
    const r = required(100, 40);
    expect(r.raw_required_final_price).toBeCloseTo(166.666666, 2);
    expect(r.feasible).toBe(true);
  });

  it("B — propiedad inversa (Caso J canal)", () => {
    const r = required(100, 40);
    const p = r.rounded_required_final_price!;
    const fwd = calculateChannelProfitability({
      catalogFinalPrice: p,
      taxRatePercent: 0,
      productionCost: 100,
      profile: baseProfile,
    });
    expect(fwd.channel_margin).toBeCloseTo(0.4, 4);
  });

  it("C — break-even = target margin 0 %", () => {
    const r = required(100, 0);
    const fwd = calculateChannelProfitability({
      catalogFinalPrice: 10_000,
      taxRatePercent: 0,
      productionCost: 100,
      profile: baseProfile,
    });
    expect(r.raw_required_final_price).toBeCloseTo(fwd.break_even_final_price!, 2);
  });

  it("D — fee 10 % sobre final", () => {
    const profile = { ...baseProfile, payment_fee_percent: 10 };
    const r = required(100, 40, profile);
    expect(r.raw_required_final_price).toBeCloseTo(200, 2);
    const fwd = calculateChannelProfitability({
      catalogFinalPrice: 200,
      finalPriceOverride: 200,
      taxRatePercent: 0,
      productionCost: 100,
      profile,
    });
    expect(fwd.channel_margin).toBeCloseTo(0.4, 4);
  });

  it("E — tax 21 %", () => {
    const r = required(100, 40, baseProfile, { tax: 21 });
    expect(r.raw_required_final_price).toBeCloseTo(201.67, 2);
    const fwd = calculateChannelProfitability({
      catalogFinalPrice: r.rounded_required_final_price!,
      finalPriceOverride: r.rounded_required_final_price!,
      taxRatePercent: 21,
      productionCost: 100,
      profile: baseProfile,
    });
    expect(fwd.channel_margin).toBeCloseTo(0.4, 3);
  });

  it("F — fee + tax", () => {
    const profile = { ...baseProfile, channel_fee_percent: 5, payment_fee_percent: 3 };
    const r = required(100, 30, profile, { tax: 21 });
    expect(r.feasible).toBe(true);
    const fwd = calculateChannelProfitability({
      catalogFinalPrice: r.rounded_required_final_price!,
      finalPriceOverride: r.rounded_required_final_price!,
      taxRatePercent: 21,
      productionCost: 100,
      profile,
    });
    expect(fwd.channel_margin).toBeCloseTo(0.3, 3);
  });

  it("G — costos fijos unitarios", () => {
    const profile = { ...baseProfile, fixed_fee_per_order: 20 };
    const r = required(100, 40, profile);
    expect(r.raw_required_final_price).toBeCloseTo(200, 2);
  });

  it("H — units/order amortiza fijos", () => {
    const profile = { ...baseProfile, shipping_absorbed_per_order: 60 };
    const one = required(100, 40, profile, { units: 1 });
    const three = required(100, 40, profile, { units: 3 });
    expect(three.raw_required_final_price!).toBeLessThan(one.raw_required_final_price!);
  });

  it("I — perfil inviable", () => {
    const core = rawRequiredFinalPriceForChannelMargin(100, 0, 0.5, 0.4, 0, 0.2);
    expect(core.feasible).toBe(false);
    expect(core.raw_required_final_price).toBeNull();
  });

  it("J — redondeo recalcula margen efectivo", () => {
    const r = required(100, 40, baseProfile, { rounding: "integer" });
    expect(r.rounded_required_final_price).toBe(167);
    expect(r.resulting_channel_margin).not.toBeNull();
  });

  it("L — costo producción más alto sube precio requerido", () => {
    const a = required(100, 40);
    const b = required(130, 40);
    expect(b.raw_required_final_price!).toBeGreaterThan(a.raw_required_final_price!);
  });
});
