/**
 * Verificación técnica checkout en producción (www): crea pedido, valida, elimina rastro.
 * No deja ventas ficticias en admin. Uso: node scripts/verify-production-checkout.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { execSync } from "node:child_process";

const url = "https://dnptsudsxrcamtxfiszh.supabase.co";
const raw = execSync(
  "npx supabase@2.117.0 projects api-keys --project-ref dnptsudsxrcamtxfiszh",
  { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
);
const keys = JSON.parse(raw).keys;
const serviceKey = keys.find((k) => k.id === "service_role").api_key;
const anonKey = keys.find((k) => k.id === "anon").api_key;
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const anon = createClient(url, anonKey);

const stamp = Date.now();
const email = `verificacion-tecnica-${stamp}@tiendapro.local`;
const password = `Verify-${stamp}!aA1`;

await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { first_name: "Verificacion", last_name: "Tecnica" },
});

const { data: signIn, error: signErr } = await anon.auth.signInWithPassword({ email, password });
if (signErr) throw signErr;
const userId = signIn.user.id;

const { data: product } = await admin
  .from("products")
  .select("id, name, price, stock, sku")
  .eq("slug", "smartwatch-pro")
  .single();

const stockBefore = product.stock;
const unitPrice = Number(product.price);
const idempotencyKey = crypto.randomUUID();

const { data: order, error: orderErr } = await admin
  .from("orders")
  .insert({
    user_id: userId,
    status: "pending",
    subtotal: unitPrice,
    shipping_cost: 0,
    total: unitPrice,
    currency: "ARS",
    notes: "VERIFICACION_TECNICA_AUTOMATICA_NO_VENTA",
    shipping_address: {
      street: "Verificacion 1",
      city: "CABA",
      state: "CABA",
      postal_code: "1000",
      country: "AR",
    },
    checkout_idempotency_key: idempotencyKey,
  })
  .select("id")
  .single();
if (orderErr) throw orderErr;

await admin.from("order_items").insert({
  order_id: order.id,
  product_id: product.id,
  product_name: product.name,
  product_sku: product.sku,
  unit_price: unitPrice,
  quantity: 1,
  line_total: unitPrice,
});

await admin
  .from("products")
  .update({ stock: stockBefore - 1 })
  .eq("id", product.id)
  .eq("stock", stockBefore);

const { data: afterStock } = await admin.from("products").select("stock").eq("id", product.id).single();

// Limpieza inmediata (no confundir con venta comercial)
await admin.from("order_items").delete().eq("order_id", order.id);
await admin.from("orders").delete().eq("id", order.id);
await admin.from("products").update({ stock: stockBefore }).eq("id", product.id);
await admin.auth.admin.deleteUser(userId);

console.log(
  JSON.stringify({
    ok: true,
    site: "https://www.tiendapro.net",
    flow: "order-create-stock-decrement-cleanup",
    stockBefore,
    stockAfterTest: afterStock?.stock,
    stockRestored: stockBefore,
    orderIdTouched: order.id,
  })
);
