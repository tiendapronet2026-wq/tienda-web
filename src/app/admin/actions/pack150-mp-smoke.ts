"use server";

import { requireAdmin, getCurrentProfile } from "@/lib/auth/session";
import { startPack150MercadoPagoSmokeCheckoutForAdmin } from "@/lib/digital/pack150-mp-smoke";
import { isPack150MpSmokeFeatureEnabled } from "@/lib/digital/pack150-mp-smoke-guard";

/**
 * Smoke monetario Pack 150 → Mercado Pago Checkout Pro (Orders API).
 * Requiere admin + TIENDAPRO_DIGITAL_SMOKE_ENABLED=1 + TIENDAPRO_MP_ORDERS_CHECKOUT_ENABLED=1.
 * No expone endpoint público; no acepta producto/precio del cliente.
 */
export async function adminStartPack150MercadoPagoSmokeCheckout(input?: {
  /** Parámetros opcionales solo para regresión interna; UI no los envía. */
  requestedProductSlug?: string;
  clientPrice?: number;
}) {
  if (!isPack150MpSmokeFeatureEnabled()) {
    return { error: "Smoke Pack 150 + MP deshabilitado (flags)." };
  }

  const { user } = await requireAdmin();
  const profile = await getCurrentProfile();

  const result = await startPack150MercadoPagoSmokeCheckoutForAdmin({
    isAuthenticated: Boolean(user),
    isAdmin: profile?.role === "admin" && profile.status === "active",
    buyerUserId: user.id,
    buyerEmail: user.email ?? "admin@tiendapro.net",
    requestedProductSlug: input?.requestedProductSlug,
    clientPrice: input?.clientPrice,
  });

  if (!result.ok) {
    const messages: Record<string, string> = {
      unauthenticated: "Sesión inválida.",
      not_admin: "Solo administradores.",
      smoke_disabled: "Smoke digital deshabilitado.",
      mp_checkout_disabled: "Checkout MP Orders deshabilitado.",
      wrong_product: "Producto no permitido para este smoke.",
      invalid_smoke_price: "Precio smoke no autorizado (debe ser ARS 1.000).",
      price_tamper: "Precio inválido.",
    };
    return { error: messages[result.reason] ?? "Smoke no permitido." };
  }

  return {
    data: {
      orderId: result.orderId,
      checkoutUrl: result.checkoutUrl,
      serverPrice: result.serverPrice,
    },
  };
}
