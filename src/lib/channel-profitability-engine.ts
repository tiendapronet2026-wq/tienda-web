import { roundCurrency } from "@/lib/cost-engine";
import {
  netPriceFromTaxInclusiveFinal,
  percentToFraction,
  roundSuggestedPrice,
  type PriceRoundingRule,
} from "@/lib/pricing-engine";

/** Porcentaje almacenado 0–100 (config admin). */
export function validateFeePercent(percent: number, label: string): void {
  if (!Number.isFinite(percent) || percent < 0 || percent >= 100) {
    throw new Error(`${label} inválido: debe ser >= 0 y < 100.`);
  }
}

export function validateUnitsPerOrder(units: number): void {
  if (!Number.isFinite(units) || units <= 0) {
    throw new Error("Unidades por pedido inválidas: deben ser > 0.");
  }
}

export type ChannelCostProfileInput = {
  channel_fee_percent: number;
  payment_fee_percent: number;
  fixed_fee_per_order: number;
  shipping_absorbed_per_order: number;
  other_cost_per_order: number;
  default_units_per_order: number;
  /** Margen de contribución objetivo sobre venta neta (%), distinto de Gate 3A */
  target_channel_margin_percent?: number | null;
};

export function validateTargetChannelMarginPercent(percent: number): number {
  if (!Number.isFinite(percent) || percent < 0 || percent >= 100) {
    throw new Error("Margen de contribución del canal inválido: debe ser >= 0 y < 100 %.");
  }
  return percent / 100;
}

export function fixedCostPerUnit(profile: ChannelCostProfileInput, units: number): number {
  validateUnitsPerOrder(units);
  return roundCurrency(
    profile.fixed_fee_per_order / units +
      profile.shipping_absorbed_per_order / units +
      profile.other_cost_per_order / units,
    4,
  );
}

/** P = (C+F) / (((1-m)/(1+t)) - r) */
export function rawRequiredFinalPriceForChannelMargin(
  productionCost: number,
  fixedCostPerUnit: number,
  channelFeeRate: number,
  paymentFeeRate: number,
  taxRateFraction: number,
  targetMarginFraction: number,
): {
  raw_required_final_price: number | null;
  feasible: boolean;
  infeasible_reason: string | null;
  variable_fee_rate: number;
  denominator: number;
} {
  const r = channelFeeRate + paymentFeeRate;
  const invOnePlusT = taxRateFraction > 0 ? 1 / (1 + taxRateFraction) : 1;
  const denom = ((1 - targetMarginFraction) * invOnePlusT) - r;
  if (!Number.isFinite(denom) || denom <= 0) {
    return {
      raw_required_final_price: null,
      feasible: false,
      infeasible_reason:
        "Objetivo no alcanzable: impuesto de referencia, comisiones y margen de contribución consumen la venta neta.",
      variable_fee_rate: r,
      denominator: denom,
    };
  }
  const numerator = productionCost + fixedCostPerUnit;
  if (numerator < 0) {
    return {
      raw_required_final_price: null,
      feasible: false,
      infeasible_reason: "Costos inválidos.",
      variable_fee_rate: r,
      denominator: denom,
    };
  }
  return {
    raw_required_final_price: numerator / denom,
    feasible: true,
    infeasible_reason: null,
    variable_fee_rate: r,
    denominator: denom,
  };
}

export type RequiredChannelPriceInput = {
  productionCost: number;
  catalogFinalPrice: number;
  taxRatePercent: number;
  profile: ChannelCostProfileInput;
  unitsPerOrder?: number | null;
  targetChannelMarginPercent: number;
  roundingRule?: PriceRoundingRule;
};

export type RequiredChannelPriceResult = {
  production_cost: number;
  fixed_cost_per_unit: number;
  variable_fee_rate: number;
  tax_rate: number;
  target_channel_margin: number;
  raw_required_final_price: number | null;
  rounded_required_final_price: number | null;
  resulting_net_revenue: number | null;
  resulting_channel_cost: number | null;
  resulting_contribution: number | null;
  resulting_channel_margin: number | null;
  feasible: boolean;
  infeasible_reason: string | null;
  catalog_final_price: number;
  current_price_gap: number | null;
  current_price_gap_percent: number | null;
};

export function calculateRequiredChannelPrice(
  input: RequiredChannelPriceInput,
): RequiredChannelPriceResult {
  if (!Number.isFinite(input.productionCost) || input.productionCost < 0) {
    throw new Error("Costo de producción inválido.");
  }
  validateFeePercent(input.profile.channel_fee_percent, "Comisión de canal");
  validateFeePercent(input.profile.payment_fee_percent, "Comisión de cobro");

  const units =
    input.unitsPerOrder != null && Number.isFinite(input.unitsPerOrder)
      ? input.unitsPerOrder
      : input.profile.default_units_per_order;
  validateUnitsPerOrder(units);

  const m = validateTargetChannelMarginPercent(input.targetChannelMarginPercent);
  const taxFrac = percentToFraction(input.taxRatePercent);
  const channelRate = input.profile.channel_fee_percent / 100;
  const paymentRate = input.profile.payment_fee_percent / 100;
  const fixedUnit = fixedCostPerUnit(input.profile, units);

  const core = rawRequiredFinalPriceForChannelMargin(
    input.productionCost,
    fixedUnit,
    channelRate,
    paymentRate,
    taxFrac,
    m,
  );

  const catalog = roundCurrency(input.catalogFinalPrice, 2);
  const base: RequiredChannelPriceResult = {
    production_cost: input.productionCost,
    fixed_cost_per_unit: fixedUnit,
    variable_fee_rate: core.variable_fee_rate,
    tax_rate: input.taxRatePercent,
    target_channel_margin: m,
    raw_required_final_price: core.raw_required_final_price,
    rounded_required_final_price: null,
    resulting_net_revenue: null,
    resulting_channel_cost: null,
    resulting_contribution: null,
    resulting_channel_margin: null,
    feasible: core.feasible,
    infeasible_reason: core.infeasible_reason,
    catalog_final_price: catalog,
    current_price_gap: null,
    current_price_gap_percent: null,
  };

  if (!core.feasible || core.raw_required_final_price == null) {
    return base;
  }

  const rule = input.roundingRule ?? "none";
  const rounded = roundSuggestedPrice(core.raw_required_final_price, rule);

  const forward = calculateChannelProfitability({
    catalogFinalPrice: catalog,
    finalPriceOverride: rounded,
    taxRatePercent: input.taxRatePercent,
    productionCost: input.productionCost,
    profile: input.profile,
    unitsPerOrder: units,
  });

  const gap = roundCurrency(rounded - catalog, 2);
  const gapPct = catalog > 0 ? gap / catalog : null;

  return {
    ...base,
    rounded_required_final_price: rounded,
    resulting_net_revenue: forward.net_sales_revenue,
    resulting_channel_cost: forward.channel_cost_per_unit,
    resulting_contribution: forward.unit_contribution,
    resulting_channel_margin: forward.channel_margin,
    current_price_gap: gap,
    current_price_gap_percent: gapPct,
  };
}

export type ChannelProfitabilityInput = {
  catalogFinalPrice: number;
  finalPriceOverride?: number | null;
  taxRatePercent: number;
  productionCost: number;
  profile: ChannelCostProfileInput;
  unitsPerOrder?: number | null;
};

export type ChannelProfitabilityResult = {
  final_price: number;
  catalog_final_price: number;
  tax_rate: number;
  net_sales_revenue: number;
  production_cost: number;
  units_per_order: number;
  channel_fee: number;
  payment_fee: number;
  fixed_fee_unit: number;
  shipping_unit: number;
  other_cost_unit: number;
  channel_cost_per_unit: number;
  unit_contribution: number;
  channel_margin: number | null;
  return_on_production_cost: number | null;
  break_even_final_price: number | null;
  break_even_viable: boolean;
};

/** Caso particular: margen de contribución objetivo = 0 (equilibrio). */
export function breakEvenFinalPrice(
  productionCost: number,
  fixedCostPerUnit: number,
  channelFeeRate: number,
  paymentFeeRate: number,
  taxRateFraction: number,
): { price: number | null; viable: boolean } {
  const core = rawRequiredFinalPriceForChannelMargin(
    productionCost,
    fixedCostPerUnit,
    channelFeeRate,
    paymentFeeRate,
    taxRateFraction,
    0,
  );
  if (!core.feasible || core.raw_required_final_price == null) {
    return { price: null, viable: false };
  }
  return { price: roundCurrency(core.raw_required_final_price, 2), viable: true };
}

export function calculateChannelProfitability(
  input: ChannelProfitabilityInput,
): ChannelProfitabilityResult {
  const catalogFinalPrice = input.catalogFinalPrice;
  const finalPrice =
    input.finalPriceOverride != null && Number.isFinite(input.finalPriceOverride)
      ? input.finalPriceOverride
      : catalogFinalPrice;

  if (!Number.isFinite(finalPrice) || finalPrice < 0) {
    throw new Error("Precio final inválido.");
  }
  if (!Number.isFinite(input.productionCost) || input.productionCost < 0) {
    throw new Error("Costo de producción inválido.");
  }

  const taxRate = percentToFraction(input.taxRatePercent);
  const units =
    input.unitsPerOrder != null && Number.isFinite(input.unitsPerOrder)
      ? input.unitsPerOrder
      : input.profile.default_units_per_order;
  validateUnitsPerOrder(units);

  validateFeePercent(input.profile.channel_fee_percent, "Comisión de canal");
  validateFeePercent(input.profile.payment_fee_percent, "Comisión de cobro");

  const channelRate = input.profile.channel_fee_percent / 100;
  const paymentRate = input.profile.payment_fee_percent / 100;

  const netSales =
    netPriceFromTaxInclusiveFinal(finalPrice, taxRate) ?? roundCurrency(finalPrice, 2);

  const channelFee = roundCurrency(finalPrice * channelRate, 2);
  const paymentFee = roundCurrency(finalPrice * paymentRate, 2);

  const fixedFeeUnit = roundCurrency(input.profile.fixed_fee_per_order / units, 4);
  const shippingUnit = roundCurrency(input.profile.shipping_absorbed_per_order / units, 4);
  const otherUnit = roundCurrency(input.profile.other_cost_per_order / units, 4);

  const channelCostPerUnit = roundCurrency(
    channelFee + paymentFee + fixedFeeUnit + shippingUnit + otherUnit,
    4,
  );

  const unitContribution = roundCurrency(
    netSales - input.productionCost - channelCostPerUnit,
    4,
  );

  const channelMargin = netSales > 0 ? unitContribution / netSales : null;
  const returnOnProductionCost =
    input.productionCost > 0 ? unitContribution / input.productionCost : null;

  const beCore = rawRequiredFinalPriceForChannelMargin(
    input.productionCost,
    fixedFeeUnit + shippingUnit + otherUnit,
    channelRate,
    paymentRate,
    taxRate,
    0,
  );

  return {
    final_price: roundCurrency(finalPrice, 2),
    catalog_final_price: roundCurrency(catalogFinalPrice, 2),
    tax_rate: input.taxRatePercent,
    net_sales_revenue: netSales,
    production_cost: input.productionCost,
    units_per_order: units,
    channel_fee: channelFee,
    payment_fee: paymentFee,
    fixed_fee_unit: fixedFeeUnit,
    shipping_unit: shippingUnit,
    other_cost_unit: otherUnit,
    channel_cost_per_unit: channelCostPerUnit,
    unit_contribution: unitContribution,
    channel_margin: channelMargin,
    return_on_production_cost: returnOnProductionCost,
    break_even_final_price:
      beCore.feasible && beCore.raw_required_final_price != null
        ? roundCurrency(beCore.raw_required_final_price, 2)
        : null,
    break_even_viable: beCore.feasible,
  };
}
