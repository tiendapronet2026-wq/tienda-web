import { roundCurrency } from "@/lib/cost-engine";

/** Margen sobre venta: (precio - costo) / precio */
export function calculateMarginOnSale(cost: number, salePrice: number): number | null {
  if (!Number.isFinite(cost) || !Number.isFinite(salePrice)) return null;
  if (salePrice <= 0) return null;
  return (salePrice - cost) / salePrice;
}

/** Recargo sobre costo: (precio - costo) / costo */
export function calculateMarkupOnCost(cost: number, salePrice: number): number | null {
  if (!Number.isFinite(cost) || !Number.isFinite(salePrice)) return null;
  if (cost <= 0) return salePrice > cost ? null : 0;
  return (salePrice - cost) / cost;
}

/** `targetMargin` es fracción sobre venta: 0.4 = 40 % */
export function validateTargetMarginOnSale(targetMargin: number): void {
  if (!Number.isFinite(targetMargin)) throw new Error("Margen objetivo inválido.");
  if (targetMargin < 0) throw new Error("El margen objetivo no puede ser negativo.");
  if (targetMargin >= 1) throw new Error("El margen objetivo debe ser menor que 100 %.");
}

/** Precio neto para alcanzar margen sobre venta (no es markup). */
export function netPriceFromTargetMarginOnSale(cost: number, targetMargin: number): number {
  validateTargetMarginOnSale(targetMargin);
  if (cost < 0) throw new Error("Costo inválido.");
  if (targetMargin === 0) return roundCurrency(cost, 4);
  return roundCurrency(cost / (1 - targetMargin), 4);
}

export type PriceRoundingRule = "none" | "integer" | "ten" | "hundred";

export function roundSuggestedPrice(value: number, rule: PriceRoundingRule): number {
  if (!Number.isFinite(value)) throw new Error("Precio inválido.");
  switch (rule) {
    case "none":
      return roundCurrency(value, 2);
    case "integer":
      return Math.round(value);
    case "ten":
      return Math.round(value / 10) * 10;
    case "hundred":
      return Math.round(value / 100) * 100;
    default:
      throw new Error("Regla de redondeo desconocida.");
  }
}

/** Convierte porcentaje 0–100 (config) a fracción 0–1. */
export function percentToFraction(percent: number): number {
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    throw new Error("Porcentaje inválido.");
  }
  return percent / 100;
}

export type SuggestedPriceInput = {
  productionCost: number;
  /** Margen sobre venta deseado, fracción 0 ≤ m < 1 */
  targetMarginOnSale: number;
  /** Tasa impositiva sobre neto, fracción 0–1 (ej. 0.21) */
  taxRateOnNet: number;
  roundingRule: PriceRoundingRule;
};

export type SuggestedPriceResult = {
  production_cost: number;
  target_margin_on_sale: number;
  net_price: number;
  tax_rate_on_net: number;
  tax_amount: number;
  suggested_price: number;
};

export function calculateSuggestedPrice(input: SuggestedPriceInput): SuggestedPriceResult {
  const productionCost = roundCurrency(input.productionCost, 4);
  if (productionCost < 0) throw new Error("Costo de producción inválido.");
  const targetMargin = input.targetMarginOnSale;
  validateTargetMarginOnSale(targetMargin);
  const taxRate = input.taxRateOnNet;
  if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 1) {
    throw new Error("Tasa impositiva inválida.");
  }

  const netPrice = netPriceFromTargetMarginOnSale(productionCost, targetMargin);
  const taxAmount = roundCurrency(netPrice * taxRate, 4);
  const beforeRound = roundCurrency(netPrice + taxAmount, 4);
  const suggestedPrice = roundSuggestedPrice(beforeRound, input.roundingRule);

  return {
    production_cost: productionCost,
    target_margin_on_sale: targetMargin,
    net_price: netPrice,
    tax_rate_on_net: taxRate,
    tax_amount: taxAmount,
    suggested_price: suggestedPrice,
  };
}

export type PricingAnalysisInput = {
  productionCost: number;
  currentSalePrice: number;
  targetMarginOnSale: number;
  taxRateOnNet: number;
  roundingRule: PriceRoundingRule;
};

export type PricingAnalysis = SuggestedPriceResult & {
  current_sale_price: number;
  actual_margin_on_sale: number | null;
  actual_markup_on_cost: number | null;
  unit_result: number | null;
  below_cost: boolean;
};

export function analyzeProductPricing(input: PricingAnalysisInput): PricingAnalysis {
  const suggested = calculateSuggestedPrice({
    productionCost: input.productionCost,
    targetMarginOnSale: input.targetMarginOnSale,
    taxRateOnNet: input.taxRateOnNet,
    roundingRule: input.roundingRule,
  });
  const current = roundCurrency(input.currentSalePrice, 2);
  const actualMargin = calculateMarginOnSale(input.productionCost, current);
  const actualMarkup = calculateMarkupOnCost(input.productionCost, current);
  const unitResult =
    Number.isFinite(current) && Number.isFinite(input.productionCost)
      ? roundCurrency(current - input.productionCost, 2)
      : null;

  return {
    ...suggested,
    current_sale_price: current,
    actual_margin_on_sale: actualMargin,
    actual_markup_on_cost: actualMarkup,
    unit_result: unitResult,
    below_cost: unitResult != null && unitResult < 0,
  };
}
