import { isMercadoPagoOrdersCheckoutEnabled } from "@/lib/integrations/mercadopago/flags";
import {
  PACK_150_PRODUCT_SLUG,
  SMOKE_MP_CANONICAL_PRICE_ARS,
  SMOKE_MP_PRODUCT_SLUG,
} from "@/lib/digital/constants";
import { isDigitalSmokeEnvironment } from "@/lib/digital/smoke-guard";

export type Pack150SmokeDenyReason =
  | "unauthenticated"
  | "not_admin"
  | "smoke_disabled"
  | "mp_checkout_disabled"
  | "wrong_product"
  | "price_tamper"
  | "invalid_smoke_price";

export function isPack150MpSmokeFeatureEnabled(): boolean {
  return isDigitalSmokeEnvironment() && isMercadoPagoOrdersCheckoutEnabled();
}

export function isAuthorizedMpMonetarySmokeSlug(slug: string | null | undefined): boolean {
  return slug === SMOKE_MP_PRODUCT_SLUG;
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

  const slug = input.requestedProductSlug ?? SMOKE_MP_PRODUCT_SLUG;
  if (slug === PACK_150_PRODUCT_SLUG || !isAuthorizedMpMonetarySmokeSlug(slug)) {
    return { allowed: false, reason: "wrong_product" };
  }

  if (input.serverPrice != null) {
    const serverCents = Math.round(Number(input.serverPrice) * 100);
    const canonicalCents = Math.round(SMOKE_MP_CANONICAL_PRICE_ARS * 100);
    if (serverCents !== canonicalCents) {
      return { allowed: false, reason: "invalid_smoke_price" };
    }
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
