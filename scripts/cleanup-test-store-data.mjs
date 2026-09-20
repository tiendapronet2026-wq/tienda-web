/**
 * Limpia cuentas/pedidos de prueba @tiendapro.local (preserva admin comercial).
 * Uso: node scripts/cleanup-test-store-data.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { execSync } from "node:child_process";

const url = "https://dnptsudsxrcamtxfiszh.supabase.co";
const raw = execSync(
  "npx supabase@2.117.0 projects api-keys --project-ref dnptsudsxrcamtxfiszh",
  { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
);
const serviceKey = JSON.parse(raw).keys.find((k) => k.id === "service_role").api_key;
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

const PRESERVE = "tiendapro.net.2026@gmail.com";

const { data: users } = await admin.auth.admin.listUsers({ perPage: 500 });
const testUsers = users.users.filter(
  (u) => u.email?.endsWith("@tiendapro.local") && u.email !== PRESERVE
);

let ordersDeleted = 0;
let usersDeleted = 0;

for (const u of testUsers) {
  const { data: orders } = await admin.from("orders").select("id").eq("user_id", u.id);
  for (const o of orders ?? []) {
    await admin.from("order_items").delete().eq("order_id", o.id);
    await admin.from("orders").delete().eq("id", o.id);
    ordersDeleted++;
  }
  await admin.from("cart_items").delete().eq("user_id", u.id);
  await admin.auth.admin.deleteUser(u.id);
  usersDeleted++;
}

const { data: sw } = await admin
  .from("products")
  .select("stock")
  .eq("slug", "smartwatch-pro")
  .single();

console.log(
  JSON.stringify({
    ok: true,
    testUsersRemoved: usersDeleted,
    ordersRemoved: ordersDeleted,
    smartwatchStock: sw?.stock,
    preservedAdmin: PRESERVE,
  })
);
