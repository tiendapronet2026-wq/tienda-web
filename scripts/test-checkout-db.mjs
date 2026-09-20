/**
 * Prueba de persistencia checkout (misma lógica que placeOrder) contra dnptsudsxrcamtxfiszh.
 * Uso: node scripts/test-checkout-db.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dnptsudsxrcamtxfiszh.supabase.co";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceKey) {
  console.error("SUPABASE_SERVICE_ROLE_KEY requerida");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

async function main() {
  const email = `checkout-db-test-${Date.now()}@tiendapro.local`;
  const password = crypto.randomUUID();

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: "Checkout", last_name: "Test" },
  });
  if (createErr) throw createErr;
  const userId = created.user.id;

  const { data: product } = await admin
    .from("products")
    .select("id, name, price, stock, track_stock, is_active, sku")
    .eq("is_active", true)
    .limit(1)
    .single();

  await admin.from("cart_items").insert({
    user_id: userId,
    session_id: crypto.randomUUID(),
    product_id: product.id,
    quantity: 1,
  });

  const idempotencyKey = crypto.randomUUID();
  const unitPrice = Number(product.price);
  const subtotal = unitPrice;
  const shippingAddress = {
    street: "Test 123",
    city: "CABA",
    state: "CABA",
    postal_code: "1000",
    country: "AR",
  };

  const { data: order, error: orderErr } = await admin
    .from("orders")
    .insert({
      user_id: userId,
      status: "pending",
      subtotal,
      shipping_cost: 0,
      total: subtotal,
      shipping_address: shippingAddress,
      checkout_idempotency_key: idempotencyKey,
    })
    .select("id")
    .single();
  if (orderErr) throw orderErr;

  const { error: itemErr } = await admin.from("order_items").insert({
    order_id: order.id,
    product_id: product.id,
    product_name: product.name,
    product_sku: product.sku,
    unit_price: unitPrice,
    quantity: 1,
    line_total: unitPrice,
  });
  if (itemErr) throw itemErr;

  const { data: beforeStock } = await admin.from("products").select("stock").eq("id", product.id).single();
  await admin
    .from("products")
    .update({ stock: beforeStock.stock - 1 })
    .eq("id", product.id)
    .eq("stock", beforeStock.stock);

  await admin.from("cart_items").delete().eq("user_id", userId);

  const { count } = await admin
    .from("order_items")
    .select("id", { count: "exact", head: true })
    .eq("order_id", order.id);

  console.log(
    JSON.stringify({
      ok: true,
      orderId: order.id,
      items: count,
      testUserEmail: email,
    })
  );

  await admin.auth.admin.deleteUser(userId);
}

main().catch((e) => {
  console.error("FAIL", e.message);
  process.exit(1);
});
