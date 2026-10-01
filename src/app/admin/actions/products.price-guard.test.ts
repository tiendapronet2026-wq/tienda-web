import { describe, expect, it } from "vitest";
import {
  stripPriceFromProductUpdatePayload,
  type ProductFormPayload,
} from "@/lib/admin/product-form-payload";

describe("Gate 3B price bypass guard", () => {
  it("update payload strips price even if client sends 150", () => {
    const payload: ProductFormPayload = {
      name: "TEST",
      category_id: null,
      description: null,
      short_description: null,
      sku: null,
      price: 150,
      compare_at_price: null,
      cost_price: null,
      stock: 0,
      low_stock_threshold: 5,
      track_stock: true,
      is_active: true,
      is_featured: false,
    };
    const row = stripPriceFromProductUpdatePayload(payload);
    expect(row).not.toHaveProperty("price");
    expect(Object.keys(row)).not.toContain("price");
  });
});
