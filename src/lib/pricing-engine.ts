import { roundCurrency } from "@/lib/cost-engine";

/**
 * Semántica Gate 3A (Opción A):
 * - `products.price` / precio de catálogo = precio final con impuesto de referencia incluido (checkout no desglosa).
 * - Costo Gate 2 = base operativa neta (sin IVA en el motor).
 * - Margen/markup actuales se calculan sobre precio neto derivado: final / (1 + tax_rate).
 */

/** Precio neto a partir del precio final de catálogo y tasa referencia sobre neto. */
export function netPriceFromTaxInclusiveFinal(
  finalSalePrice: number,
  taxRateOnNet: number,
): number | null {
  if (!Number.isFinite(finalSalePrice) || finalSalePrice < 0) return null;
  if (!Number.isFinite(taxRateOnNet) || taxRateOnNet < 0 || taxRateOnNet > 1) return null;
  if (finalSalePrice === 0) return 0;
  if (taxRateOnNet === 0) return roundCurrency(finalSalePrice, 4);
  return roundCurrency(finalSalePrice / (1 + taxRateOnNet), 4);
}

/** Margen sobre venta (neto): (precio_neto - costo) / precio_neto */
export function calculateMarginOnSale(cost: number, netSalePrice: number): number | null {
  if (!Number.isFinite(cost) || !Number.isFinite(netSalePrice)) return null;
  if (netSalePrice <= 0) return null;
  return (netSalePrice - cost) / netSalePrice;
}

/** Recargo sobre costo usando la misma base neta: (precio_neto - costo) / costo */
export function calculateMarkupOnCost(cost: number, netSalePrice: number): number | null {
  if (!Number.isFinite(cost) || !Number.isFinite(netSalePrice)) return null;
  if (cost <= 0) return netSalePrice > cost ? null : 0;
  return (netSalePrice - cost) / cost;
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
  current_net_sale_price: number | null;
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
  const currentFinal = roundCurrency(input.currentSalePrice, 2);
  const currentNet = netPriceFromTaxInclusiveFinal(currentFinal, input.taxRateOnNet);
  const actualMargin =
    currentNet != null ? calculateMarginOnSale(input.productionCost, currentNet) : null;
  const actualMarkup =
    currentNet != null ? calculateMarkupOnCost(input.productionCost, currentNet) : null;
  const unitResult =
    Number.isFinite(currentFinal) && Number.isFinite(input.productionCost)
      ? roundCurrency(currentFinal - input.productionCost, 2)
      : null;

  return {
    ...suggested,
    current_sale_price: currentFinal,
    current_net_sale_price: currentNet,
    actual_margin_on_sale: actualMargin,
    actual_markup_on_cost: actualMarkup,
    unit_result: unitResult,
    below_cost: unitResult != null && unitResult < 0,
  };
}
