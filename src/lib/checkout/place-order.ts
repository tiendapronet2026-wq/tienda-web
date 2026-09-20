import type { SupabaseClient } from "@supabase/supabase-js";

export type CartLine = {
  id: string;
  quantity: number;
  products: {
    id: string;
    name: string;
    sku: string | null;
    price: number;
    stock: number;
    track_stock: boolean;
    is_active: boolean;
  } | null;
};

export type ShippingInput = {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  notes?: string;
};

export function computeOrderTotals(lines: CartLine[]) {
  let subtotal = 0;
  for (const line of lines) {
    const product = line.products;
    if (!product?.is_active) {
      throw new Error(`Producto no disponible: ${product?.name ?? line.id}`);
    }
    if (product.track_stock && product.stock < line.quantity) {
      throw new Error(`Stock insuficiente para ${product.name}.`);
    }
    const unit = Number(product.price);
    if (!Number.isFinite(unit) || unit < 0) {
      throw new Error(`Precio inválido para ${product.name}.`);
    }
    subtotal += unit * line.quantity;
  }
  const shippingCost = 0;
  const total = subtotal + shippingCost;
  return { subtotal, shippingCost, total };
}

export function buildOrderItems(lines: CartLine[]) {
  return lines.map((line) => {
    const product = line.products!;
    const unitPrice = Number(product.price);
    const lineTotal = unitPrice * line.quantity;
    return {
      product_id: product.id,
      product_name: product.name,
      product_sku: product.sku,
      unit_price: unitPrice,
      quantity: line.quantity,
      line_total: lineTotal,
    };
  });
}

/** Descuenta stock tras crear pedido (estado pending, sin pago). */
export async function decrementStockForOrder(
  admin: SupabaseClient,
  lines: CartLine[]
) {
  for (const line of lines) {
    const product = line.products;
    if (!product?.track_stock) continue;

    const { data: current } = await admin
      .from("products")
      .select("stock")
      .eq("id", product.id)
      .maybeSingle<{ stock: number }>();

    if (!current || current.stock < line.quantity) {
      throw new Error(`Stock insuficiente para ${product.name}.`);
    }

    const { error } = await admin
      .from("products")
      .update({ stock: current.stock - line.quantity })
      .eq("id", product.id)
      .eq("stock", current.stock);

    if (error) {
      throw new Error(`No se pudo actualizar stock de ${product.name}.`);
    }
  }
}
