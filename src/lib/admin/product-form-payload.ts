export type ProductFormPayload = {
  name: string;
  category_id: string | null;
  description: string | null;
  short_description: string | null;
  sku: string | null;
  price?: number;
  compare_at_price: number | null;
  cost_price: number | null;
  stock: number;
  low_stock_threshold: number;
  track_stock: boolean;
  is_active: boolean;
  is_featured: boolean;
  fulfillment_type: "physical" | "digital";
};

/** Gate 3B: en edición el precio no viaja al UPDATE (solo adopción auditada). */
export function stripPriceFromProductUpdatePayload(
  payload: ProductFormPayload,
): Omit<ProductFormPayload, "price"> {
  const { price, ...rest } = payload;
  void price;
  return rest;
}
