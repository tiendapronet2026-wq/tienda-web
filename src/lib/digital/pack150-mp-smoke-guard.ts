import { isMercadoPagoOrdersCheckoutEnabled } from "@/lib/integrations/mercadopago/flags";
import { PACK_150_PRODUCT_SLUG } from "@/lib/digital/constants";
import { isDigitalSmokeEnvironment } from "@/lib/digital/smoke-guard";

export type Pack150SmokeDenyReason =
  | "unauthenticated"
  | "not_admin"
  | "smoke_disabled"
  | "mp_checkout_disabled"
  | "wrong_product"
  | "price_tamper";

export function isPack150MpSmokeFeatureEnabled(): boolean {
  return isDigitalSmokeEnvironment() && isMercadoPagoOrdersCheckoutEnabled();
}

export function evaluatePack150SmokeAccess(input: {
  isAuthenticated: boolean;
  isAdmin: boolean;
  digitalSmokeEnabled?: boolean;
  mpOrdersEnabled?: boolean;
  requestedProductSlug?: string | null;
  clientPrice?: number | null;
  serverPrice?: number | null;
}): { allowed: true } | { allowed: false; reason: Pack150SmokeDenyReason } {
  if (!input.isAuthenticated) return { allowed: false, reason: "unauthenticated" };
  if (!input.isAdmin) return { allowed: false, reason: "not_admin" };

  const digitalSmoke = input.digitalSmokeEnabled ?? isDigitalSmokeEnvironment();
  if (!digitalSmoke) return { allowed: false, reason: "smoke_disabled" };

  const mpOrders = input.mpOrdersEnabled ?? isMercadoPagoOrdersCheckoutEnabled();
  if (!mpOrders) return { allowed: false, reason: "mp_checkout_disabled" };

  if (input.requestedProductSlug && input.requestedProductSlug !== PACK_150_PRODUCT_SLUG) {
    return { allowed: false, reason: "wrong_product" };
  }

  if (
    input.clientPrice != null &&
    input.serverPrice != null &&
    Math.round(Number(input.clientPrice) * 100) !== Math.round(Number(input.serverPrice) * 100)
  ) {
    return { allowed: false, reason: "price_tamper" };
  }

  return { allowed: true };
}
