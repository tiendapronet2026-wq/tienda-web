import { roundCurrency } from "@/lib/cost-engine";
import { netPriceFromTaxInclusiveFinal, percentToFraction } from "@/lib/pricing-engine";

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
};

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

export function breakEvenFinalPrice(
  productionCost: number,
  fixedCostPerUnit: number,
  channelFeeRate: number,
  paymentFeeRate: number,
  taxRateFraction: number,
): { price: number | null; viable: boolean } {
  const r = channelFeeRate + paymentFeeRate;
  const invOnePlusT = taxRateFraction > 0 ? 1 / (1 + taxRateFraction) : 1;
  const denom = invOnePlusT - r;
  if (!Number.isFinite(denom) || denom <= 0) {
    return { price: null, viable: false };
  }
  const numerator = productionCost + fixedCostPerUnit;
  if (numerator < 0) return { price: null, viable: false };
  return { price: roundCurrency(numerator / denom, 2), viable: true };
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

  const fixedOnlyPerUnit = fixedFeeUnit + shippingUnit + otherUnit;
  const be = breakEvenFinalPrice(
    input.productionCost,
    fixedOnlyPerUnit,
    channelRate,
    paymentRate,
    taxRate,
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
    break_even_final_price: be.price,
    break_even_viable: be.viable,
  };
}
