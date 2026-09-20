"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth, getCurrentProfile } from "@/lib/auth/session";
import { getCartItems } from "@/app/actions/cart";
import { isCheckoutEnabled } from "@/lib/checkout/flags";
import {
  buildOrderItems,
  computeOrderTotals,
  decrementStockForOrder,
  type ShippingInput,
} from "@/lib/checkout/place-order";

function parseShipping(formData: FormData): ShippingInput {
  const street = String(formData.get("street") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();
  const postalCode = String(formData.get("postal_code") ?? "").trim();
  const country = String(formData.get("country") ?? "AR").trim() || "AR";
  const notes = String(formData.get("notes") ?? "").trim();

  if (street.length < 3 || city.length < 2 || state.length < 2 || postalCode.length < 3) {
    throw new Error("Completá la dirección de envío.");
  }

  return { street, city, state, postalCode, country, notes: notes || undefined };
}

export async function placeOrder(formData: FormData) {
  if (!isCheckoutEnabled()) {
    throw new Error("El checkout no está habilitado en este entorno.");
  }

  const user = await requireAuth("/login?redirect=/checkout");
  const profile = await getCurrentProfile();
  const idempotencyKey = String(formData.get("idempotency_key") ?? "").trim();

  if (!idempotencyKey || idempotencyKey.length < 8) {
    throw new Error("Sesión de checkout inválida. Recargá la página.");
  }

  const shipping = parseShipping(formData);
  const items = await getCartItems();

  if (!items.length) {
    redirect("/carrito?error=vacio");
  }

  const lines = items.filter((row) => row.products) as Parameters<typeof computeOrderTotals>[0];
  const { subtotal, shippingCost, total } = computeOrderTotals(lines);

  const admin = createAdminClient();
  const supabase = await createClient();

  const { data: existing } = await admin
    .from("orders")
    .select("id")
    .eq("checkout_idempotency_key", idempotencyKey)
    .maybeSingle<{ id: string }>();

  if (existing?.id) {
    redirect(`/checkout/confirmacion?pedido=${existing.id}`);
  }

  const shippingAddress = {
    street: shipping.street,
    city: shipping.city,
    state: shipping.state,
    postal_code: shipping.postalCode,
    country: shipping.country,
    recipient: profile
      ? `${profile.first_name} ${profile.last_name}`.trim()
      : user.email,
  };

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: user.id,
      status: "pending",
      subtotal,
      shipping_cost: shippingCost,
      total,
      currency: "ARS",
      shipping_address: shippingAddress,
      notes: shipping.notes ?? null,
      checkout_idempotency_key: idempotencyKey,
    })
    .select("id")
    .single<{ id: string }>();

  if (orderError || !order) {
    if (orderError?.code === "23505") {
      const { data: dup } = await admin
        .from("orders")
        .select("id")
        .eq("checkout_idempotency_key", idempotencyKey)
        .maybeSingle<{ id: string }>();
      if (dup?.id) redirect(`/checkout/confirmacion?pedido=${dup.id}`);
    }
    throw new Error("No se pudo crear el pedido. Intentá de nuevo.");
  }

  const orderItems = buildOrderItems(lines).map((item) => ({
    ...item,
    order_id: order.id,
  }));

  const { error: itemsError } = await supabase.from("order_items").insert(orderItems);

  if (itemsError) {
    await admin.from("orders").delete().eq("id", order.id);
    throw new Error("No se pudieron registrar los ítems del pedido.");
  }

  try {
    await decrementStockForOrder(admin, lines);
  } catch (e) {
    await admin.from("order_items").delete().eq("order_id", order.id);
    await admin.from("orders").delete().eq("id", order.id);
    throw e;
  }

  const cartIds = items.map((i) => i.id);
  await admin.from("cart_items").delete().in("id", cartIds);

  revalidatePath("/carrito");
  revalidatePath("/admin/pedidos");
  redirect(`/checkout/confirmacion?pedido=${order.id}`);
}
