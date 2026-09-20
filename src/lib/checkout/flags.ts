/**
 * Checkout tienda: requiere TIENDAPRO_CHECKOUT_ENABLED=1.
 * En Production además TIENDAPRO_CHECKOUT_PRODUCTION=1.
 */
export function isCheckoutEnabled(): boolean {
  if (process.env.TIENDAPRO_CHECKOUT_ENABLED !== "1") {
    return false;
  }
  if (process.env.VERCEL_ENV === "production") {
    return process.env.TIENDAPRO_CHECKOUT_PRODUCTION === "1";
  }
  return true;
}
