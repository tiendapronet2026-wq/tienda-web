/** Slug canónico del pack Launch Track (precio en `products.price`, editable en admin). */
export const PACK_150_PRODUCT_SLUG = "pack-150-cursos-digitales-bonos";

/** Producto exclusivo smoke monetario MP (ARS 1.000); no confundir con Pack comercial. */
export const SMOKE_MP_PRODUCT_SLUG = "smoke-mp-pack-150";
export const SMOKE_MP_PRODUCT_SKU = "SMOKE-MP-PACK-150";
/** Precio canónico server-side del smoke (debe coincidir con `products.price`). */
export const SMOKE_MP_CANONICAL_PRICE_ARS = 1000;

export const PACK_150_OFFER_PATH = "/oferta/pack-150";

export const APPROVED_ORDER_STATUSES = new Set(["paid"]);

export type DigitalEntitlementStatus = "pending" | "active" | "revoked";

/** Marca pedidos creados para smoke admin L2 (no producción salvo flag explícito). */
export const DIGITAL_TEST_ORDER_MARKER = "[DIGITAL_TEST]";
