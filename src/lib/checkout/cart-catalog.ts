import type { SupabaseClient } from "@supabase/supabase-js";
import type { CartLine } from "@/lib/checkout/place-order";

type CatalogProduct = {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  stock: number;
  track_stock: boolean;
  is_active: boolean;
  fulfillment_type: string;
};

/** Precios y fulfillment siempre desde catálogo server-side (no confiar en snapshot del cliente). */
export async function reloadCartLinesFromCatalog(
  admin: SupabaseClient,
  lines: CartLine[],
): Promise<CartLine[]> {
  const productIds = [
    ...new Set(
      lines
        .map((line) => line.products?.id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  if (!productIds.length) {
    return lines;
  }

  const { data: products, error } = await admin
    .from("products")
    .select("id, name, sku, price, stock, track_stock, is_active, fulfillment_type")
    .in("id", productIds);

  if (error || !products?.length) {
    throw new Error("No se pudo validar el carrito.");
  }

  const byId = new Map(
    (products as CatalogProduct[]).map((p) => [p.id, { ...p, price: Number(p.price) }]),
  );

  return lines.map((line) => {
    const id = line.products?.id;
    if (!id) {
      throw new Error("Producto no disponible en el carrito.");
    }
    const product = byId.get(id);
    if (!product) {
      throw new Error("Producto no disponible en el carrito.");
    }
    return { ...line, products: product };
  });
}
