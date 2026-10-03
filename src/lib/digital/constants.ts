/** Slug canónico del pack Launch Track (precio en `products.price`, editable en admin). */
export const PACK_150_PRODUCT_SLUG = "pack-150-cursos-digitales-bonos";

export const PACK_150_OFFER_PATH = "/oferta/pack-150";

export const APPROVED_ORDER_STATUSES = new Set(["paid"]);

export type DigitalEntitlementStatus = "pending" | "active" | "revoked";

/** Marca pedidos creados para smoke admin L2 (no producción salvo flag explícito). */
export const DIGITAL_TEST_ORDER_MARKER = "[DIGITAL_TEST]";
