import type { SupabaseClient } from "@supabase/supabase-js";
import { PACK_150_OFFER_PATH, PACK_150_PRODUCT_SLUG } from "@/lib/digital/constants";
import { formatPrice } from "@/lib/utils";
import { getSiteUrl } from "@/lib/cart/session";
import { buildMessengerOfferUrl } from "@/lib/sales/tracking";

export type PackCatalogSnapshot = {
  slug: string;
  name: string;
  price: number;
  priceFormatted: string;
  isActive: boolean;
  offerUrl: string | null;
};

export async function loadPack150Catalog(
  admin: SupabaseClient,
  trackingToken?: string,
): Promise<PackCatalogSnapshot> {
  const { data: product } = await admin
    .from("products")
    .select("name, slug, price, is_active")
    .eq("slug", PACK_150_PRODUCT_SLUG)
    .maybeSingle<{ name: string; slug: string; price: number; is_active: boolean }>();

  const price = product ? Number(product.price) : 0;
  const isActive = Boolean(product?.is_active);
  const site = getSiteUrl().replace(/\/$/, "");

  return {
    slug: PACK_150_PRODUCT_SLUG,
    name: product?.name ?? "Pack +150 Cursos Digitales + Bonos",
    price,
    priceFormatted: formatPrice(price),
    isActive,
    offerUrl: isActive
      ? buildMessengerOfferUrl(`${site}${PACK_150_OFFER_PATH}`, trackingToken)
      : null,
  };
}
