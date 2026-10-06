import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  DIGITAL_TEST_ORDER_MARKER,
  SMOKE_MP_PRODUCT_SKU,
  SMOKE_MP_PRODUCT_SLUG,
} from "@/lib/digital/constants";
import { evaluatePack150SmokeAccess } from "@/lib/digital/pack150-mp-smoke-guard";
import { ensureMercadoPagoCheckoutForOrder } from "@/lib/integrations/mercadopago/mp-checkout";

const MP_MONETARY_SMOKE_MARKER = "[SMOKE_MP_MONETARY]";
/** @deprecated Compat auditoría pedidos previos al producto ARS 1.000 */
const LEGACY_PACK150_MP_SMOKE_MARKER = "[PACK150_MP_SMOKE]";

export type SmokeMpProductRow = {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  fulfillment_type: string;
  is_active: boolean;
};

export async function loadSmokeMpProductForMonetarySmoke(
  admin: SupabaseClient,
): Promise<SmokeMpProductRow> {
  const { data, error } = await admin
    .from("products")
    .select("id, name, sku, price, fulfillment_type, is_active")
    .eq("slug", SMOKE_MP_PRODUCT_SLUG)
    .maybeSingle<SmokeMpProductRow>();

  if (error || !data) {
    throw new Error("Producto smoke MP no encontrado en catálogo.");
  }
  if (data.sku && data.sku !== SMOKE_MP_PRODUCT_SKU) {
    throw new Error("Producto smoke MP no autorizado (SKU).");
  }
  if (data.fulfillment_type !== "digital") {
    throw new Error("Producto smoke MP no es digital.");
  }

  return { ...data, price: Number(data.price) };
}

export async function createSmokeMpMonetaryOrder(params: {
  admin: SupabaseClient;
  buyerUserId: string;
  idempotencyKey?: string;
}): Promise<{ orderId: string; total: number; currency: string }> {
  const product = await loadSmokeMpProductForMonetarySmoke(params.admin);
  const idempotencyKey = params.idempotencyKey ?? `smoke-mp-${randomUUID()}`;
  const total = product.price;
  const notes = `${DIGITAL_TEST_ORDER_MARKER} ${MP_MONETARY_SMOKE_MARKER}`.trim();

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
    throw new Error("No se pudo crear el pedido smoke MP.");
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
    throw new Error("No se pudo registrar el ítem del pedido smoke MP.");
  }

  return { orderId: order.id, total: Number(order.total), currency: order.currency };
}

/** Reutiliza el pedido smoke pendiente más reciente del admin (sin MP Order) para evitar duplicados en retry. */
export async function findReusablePendingSmokeMpOrder(
  admin: SupabaseClient,
  buyerUserId: string,
): Promise<{ orderId: string; total: number; currency: string } | null> {
  const { data: rows, error } = await admin
    .from("orders")
    .select("id, total, currency, status, mp_order_id, notes, created_at")
    .eq("user_id", buyerUserId)
    .eq("status", "pending")
    .is("mp_order_id", null)
    .ilike("notes", `%${MP_MONETARY_SMOKE_MARKER}%`)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error || !rows?.length) return null;
  const row = rows[0] as { id: string; total: number; currency: string };
  return { orderId: row.id, total: Number(row.total), currency: row.currency };
}

export async function ensureSmokeMpMonetaryOrder(params: {
  admin: SupabaseClient;
  buyerUserId: string;
}): Promise<{ orderId: string; total: number; currency: string; reused: boolean }> {
  const existing = await findReusablePendingSmokeMpOrder(params.admin, params.buyerUserId);
  if (existing) {
    return { ...existing, reused: true };
  }
  const created = await createSmokeMpMonetaryOrder(params);
  return { ...created, reused: false };
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
    const loaded = await loadSmokeMpProductForMonetarySmoke(admin);
    serverPrice = loaded.price;
  } catch {
    return { ok: false, reason: "wrong_product" };
  }

  const gate = evaluatePack150SmokeAccess({
    isAuthenticated: params.isAuthenticated,
    isAdmin: params.isAdmin,
    requestedProductSlug: params.requestedProductSlug ?? SMOKE_MP_PRODUCT_SLUG,
    clientPrice: params.clientPrice,
    serverPrice,
  });

  if (!gate.allowed) {
    return { ok: false, reason: gate.reason };
  }

  let orderId: string;
  try {
    const order = await ensureSmokeMpMonetaryOrder({
      admin,
      buyerUserId: params.buyerUserId,
    });
    orderId = order.orderId;
  } catch {
    return { ok: false, reason: "order_create_failed" };
  }

  try {
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
  } catch (e) {
    const message = e instanceof Error ? e.message : "mp_checkout_failed";
    if (message.includes("Mercado Pago no está conectado")) {
      return { ok: false, reason: "mp_not_connected" };
    }
    if (message.includes("Sin credenciales OAuth") || message.includes("access token")) {
      return { ok: false, reason: "mp_oauth_credentials" };
    }
    return { ok: false, reason: "mp_checkout_failed" };
  }
}

export function isPack150MpSmokeOrder(notes: string | null | undefined): boolean {
  return Boolean(
    notes?.includes(MP_MONETARY_SMOKE_MARKER) || notes?.includes(LEGACY_PACK150_MP_SMOKE_MARKER),
  );
}

