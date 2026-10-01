/**
 * Adapter de solo lectura para futura integración M&M (Gate 3A).
 * M&M puede consultar análisis de pricing; no aplica ni persiste precios aquí.
 */
import type { PricingAnalysis } from "@/lib/pricing-engine";

export type MmProductPricingView = {
  productId: string;
  productionCost: number;
  currentSalePrice: number;
  suggestedPrice: number;
  actualMarginOnSale: number | null;
  targetMarginOnSale: number;
  gapToTarget: number | null;
};

export function toMmProductPricingView(
  productId: string,
  analysis: PricingAnalysis,
): MmProductPricingView {
  const gap =
    analysis.actual_margin_on_sale != null
      ? analysis.target_margin_on_sale - analysis.actual_margin_on_sale
      : null;
  return {
    productId,
    productionCost: analysis.production_cost,
    currentSalePrice: analysis.current_sale_price,
    suggestedPrice: analysis.suggested_price,
    actualMarginOnSale: analysis.actual_margin_on_sale,
    targetMarginOnSale: analysis.target_margin_on_sale,
    gapToTarget: gap,
  };
}
