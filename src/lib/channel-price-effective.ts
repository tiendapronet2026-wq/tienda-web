/** Fallback Gate 3E: sin override activo → precio de catálogo. */
export function effectiveChannelFinalPrice(
  catalogPrice: number,
  channelOverride: { final_price: number; is_active: boolean } | null | undefined,
): { price: number; usesCatalog: boolean } {
  if (
    channelOverride &&
    channelOverride.is_active &&
    Number.isFinite(channelOverride.final_price) &&
    channelOverride.final_price >= 0
  ) {
    return { price: channelOverride.final_price, usesCatalog: false };
  }
  return { price: catalogPrice, usesCatalog: true };
}
