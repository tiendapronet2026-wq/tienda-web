/**
 * Adapter READ-ONLY para futura integración M&M (Gate 3C).
 * Expone simulación de rentabilidad por perfil; no modifica perfiles ni precios.
 */
import type {
  ChannelProfitabilityResult,
  RequiredChannelPriceResult,
} from "@/lib/channel-profitability-engine";

export type MmChannelProfitabilityView = {
  productId: string;
  profileId: string;
  profileName?: string;
  finalPrice: number;
  catalogFinalPrice: number;
  netSalesRevenue: number;
  productionCost: number;
  unitContribution: number;
  channelMargin: number | null;
  breakEvenFinalPrice: number | null;
  breakEvenViable: boolean;
  dominantCostLabel: "channel_fee" | "payment_fee" | "fixed" | "shipping" | "other" | "none";
};

function dominantChannelCost(r: ChannelProfitabilityResult): MmChannelProfitabilityView["dominantCostLabel"] {
  const parts = [
    { k: "channel_fee" as const, v: r.channel_fee },
    { k: "payment_fee" as const, v: r.payment_fee },
    { k: "fixed" as const, v: r.fixed_fee_unit },
    { k: "shipping" as const, v: r.shipping_unit },
    { k: "other" as const, v: r.other_cost_unit },
  ];
  const top = parts.reduce((a, b) => (b.v > a.v ? b : a), parts[0]);
  return top.v > 0 ? top.k : "none";
}

export type MmChannelTargetPriceView = {
  productId: string;
  profileId: string;
  targetMarginPercent: number;
  requiredFinalPrice: number | null;
  catalogPrice: number;
  priceGap: number | null;
  feasible: boolean;
  infeasibleReason: string | null;
};

export function toMmChannelTargetPriceView(
  productId: string,
  profileId: string,
  result: RequiredChannelPriceResult,
): MmChannelTargetPriceView {
  return {
    productId,
    profileId,
    targetMarginPercent: result.target_channel_margin * 100,
    requiredFinalPrice: result.rounded_required_final_price,
    catalogPrice: result.catalog_final_price,
    priceGap: result.current_price_gap,
    feasible: result.feasible,
    infeasibleReason: result.infeasible_reason,
  };
}

export function toMmChannelProfitabilityView(
  productId: string,
  profileId: string,
  profileName: string | undefined,
  result: ChannelProfitabilityResult,
): MmChannelProfitabilityView {
  return {
    productId,
    profileId,
    profileName,
    finalPrice: result.final_price,
    catalogFinalPrice: result.catalog_final_price,
    netSalesRevenue: result.net_sales_revenue,
    productionCost: result.production_cost,
    unitContribution: result.unit_contribution,
    channelMargin: result.channel_margin,
    breakEvenFinalPrice: result.break_even_final_price,
    breakEvenViable: result.break_even_viable,
    dominantCostLabel: dominantChannelCost(result),
  };
}
