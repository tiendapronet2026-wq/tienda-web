import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  DIGITAL_TEST_ORDER_MARKER,
  PACK_150_PRODUCT_SLUG,
} from "@/lib/digital/constants";
import { evaluatePack150SmokeAccess } from "@/lib/digital/pack150-mp-smoke-guard";
import { ensureMercadoPagoCheckoutForOrder } from "@/lib/integrations/mercadopago/mp-checkout";

const PACK150_MP_SMOKE_MARKER = "[PACK150_MP_SMOKE]";

export type Pack150ProductRow = {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  fulfillment_type: string;
  is_active: boolean;
};

export async function loadPack150ProductForSmoke(
  admin: SupabaseClient,
): Promise<Pack150ProductRow> {
  const { data, error } = await admin
    .from("products")
    .select("id, name, sku, price, fulfillment_type, is_active")
    .eq("slug", PACK_150_PRODUCT_SLUG)
    .maybeSingle<Pack150ProductRow>();

  if (error || !data) {
    throw new Error("Pack 150 no encontrado en catálogo.");
  }
  if (data.fulfillment_type !== "digital") {
    throw new Error("Pack 150 no es un producto digital.");
  }

  return { ...data, price: Number(data.price) };
}

export async function createPack150SmokeOrder(params: {
  admin: SupabaseClient;
  buyerUserId: string;
  idempotencyKey?: string;
}): Promise<{ orderId: string; total: number; currency: string }> {
  const product = await loadPack150ProductForSmoke(params.admin);
  const idempotencyKey = params.idempotencyKey ?? `pack150-smoke-${randomUUID()}`;
  const total = product.price;
  const notes = `${DIGITAL_TEST_ORDER_MARKER} ${PACK150_MP_SMOKE_MARKER}`.trim();

  const { data: order, error: orderError } = await params.admin
    .from("orders")
    .insert({
      user_id: params.buyerUserId,
      status: "pending",
      subtotal: total,
      shipping_cost: 0,
      total,
      currency: "ARS",
      shipping_address: null,
      notes,
      checkout_idempotency_key: idempotencyKey,
    })
    .select("id, total, currency")
    .single<{ id: string; total: number; currency: string }>();

  if (orderError || !order) {
    throw new Error("No se pudo crear el pedido de smoke Pack 150.");
  }

  const { error: itemError } = await params.admin.from("order_items").insert({
    order_id: order.id,
    product_id: product.id,
    product_name: product.name,
    product_sku: product.sku,
    unit_price: product.price,
    quantity: 1,
    line_total: product.price,
  });

  if (itemError) {
    await params.admin.from("orders").delete().eq("id", order.id);
    throw new Error("No se pudo registrar el ítem del pedido de smoke.");
  }

  return { orderId: order.id, total: Number(order.total), currency: order.currency };
}

export async function startPack150MercadoPagoSmokeCheckoutForAdmin(params: {
  isAuthenticated: boolean;
  isAdmin: boolean;
  buyerUserId: string;
  buyerEmail: string;
  /** Solo para tests — rechazar slugs/precios manipulados si se agregaran parámetros cliente. */
  requestedProductSlug?: string | null;
  clientPrice?: number | null;
}): Promise<
  | { ok: true; orderId: string; checkoutUrl: string; serverPrice: number }
  | { ok: false; reason: string }
> {
  const admin = createAdminClient();
  let serverPrice: number | null = null;
  try {
    const loaded = await loadPack150ProductForSmoke(admin);
    serverPrice = loaded.price;
  } catch {
    return { ok: false, reason: "wrong_product" };
  }

  const gate = evaluatePack150SmokeAccess({
    isAuthenticated: params.isAuthenticated,
    isAdmin: params.isAdmin,
    requestedProductSlug: params.requestedProductSlug ?? PACK_150_PRODUCT_SLUG,
    clientPrice: params.clientPrice,
    serverPrice,
  });

  if (!gate.allowed) {
    return { ok: false, reason: gate.reason };
  }

  const { orderId } = await createPack150SmokeOrder({
    admin,
    buyerUserId: params.buyerUserId,
  });
  const { checkoutUrl } = await ensureMercadoPagoCheckoutForOrder({
    orderId,
    userEmail: params.buyerEmail,
  });

  return {
    ok: true,
    orderId,
    checkoutUrl,
    serverPrice: serverPrice ?? 0,
  };
}

export function isPack150MpSmokeOrder(notes: string | null | undefined): boolean {
  return Boolean(notes?.includes(PACK150_MP_SMOKE_MARKER));
}
