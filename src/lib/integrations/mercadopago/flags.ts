import { isCheckoutEnabled } from "@/lib/checkout/flags";

/** Gate 3H: Checkout Pro vía Orders API (sin activar Pack público por sí solo). */
export function isMercadoPagoOrdersCheckoutEnabled(): boolean {
  if (!isCheckoutEnabled()) return false;
  return process.env.TIENDAPRO_MP_ORDERS_CHECKOUT_ENABLED === "1";
}
