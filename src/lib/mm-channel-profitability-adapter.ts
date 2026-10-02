/**
 * Adapter READ-ONLY para futura integración M&M (Gates 3C–3E).
 * Expone simulación, objetivo y precios adoptados por canal; no escribe en BD.
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

export type MmChannelAdoptedPriceView = {
  productId: string;
  profileId: string;
  catalogPrice: number;
  channelPrice: number | null;
  usesCatalogFallback: boolean;
  targetRequiredPrice: number | null;
  targetMarginPercent: number | null;
  actualChannelMargin: number | null;
  unitContribution: number | null;
};

/** Vista consolidada Gate 3E (solo lectura). */
export function toMmChannelAdoptedPriceView(
  productId: string,
  profileId: string,
  catalogPrice: number,
  channelOverride: { final_price: number; is_active: boolean } | null | undefined,
  target: RequiredChannelPriceResult | null,
  forwardAtChannelPrice: ChannelProfitabilityResult | null,
): MmChannelAdoptedPriceView {
  const active =
    channelOverride?.is_active &&
    channelOverride.final_price != null &&
    Number.isFinite(channelOverride.final_price);
  return {
    productId,
    profileId,
    catalogPrice,
    channelPrice: active ? channelOverride!.final_price : null,
    usesCatalogFallback: !active,
    targetRequiredPrice: target?.rounded_required_final_price ?? null,
    targetMarginPercent: target != null ? target.target_channel_margin * 100 : null,
    actualChannelMargin: forwardAtChannelPrice?.channel_margin ?? null,
    unitContribution: forwardAtChannelPrice?.unit_contribution ?? null,
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
