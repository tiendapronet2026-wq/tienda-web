/**
 * Checkout tienda: habilitado solo cuando el flag está activo y no estamos en Production
 * (Production permanece cerrado hasta continuidad de datos o decisión explícita).
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
