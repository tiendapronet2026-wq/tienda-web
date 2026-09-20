/**
 * Smoke UI checkout en www (sin dejar pedido: borra usuario/pedido al final).
 */
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { execSync } from "node:child_process";
import { resolveSupabaseServiceRoleKey } from "./supabase-service-role.mjs";

const base = "https://www.tiendapro.net";
const url = "https://dnptsudsxrcamtxfiszh.supabase.co";
const anon = execSync(
  "npx supabase@2.117.0 projects api-keys --project-ref dnptsudsxrcamtxfiszh",
  { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
);
const anonKey = JSON.parse(anon).keys.find((k) => k.id === "anon").api_key;

const stamp = Date.now();
const email = `www-smoke-${stamp}@tiendapro.local`;
const password = `WwSmoke-${stamp}!aA1`;

const anonClient = createClient(url, anonKey);
await anonClient.auth.signUp({
  email,
  password,
  options: { data: { first_name: "Smoke", last_name: "WWW" } },
});

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`${base}/login?redirect=${encodeURIComponent("/productos/smartwatch-pro")}`);
await page.getByLabel("Email").fill(email);
await page.getByLabel("Contraseña").fill(password);
await page.getByRole("button", { name: "Ingresar" }).click();
await page.waitForURL(/productos\/smartwatch-pro/, { timeout: 60_000 });
await page.getByRole("button", { name: "Agregar al carrito" }).click();
await page.waitForTimeout(2000);
await page.goto(`${base}/carrito`);
await page.getByRole("link", { name: "Continuar al checkout" }).waitFor({ timeout: 30_000 });
await page.getByRole("link", { name: "Continuar al checkout" }).click();
await page.getByLabel("Calle y número").fill("Smoke 1");
await page.getByLabel("Ciudad").fill("CABA");
await page.getByLabel("Provincia").fill("CABA");
await page.getByLabel("Código postal").fill("1000");
await page.getByRole("button", { name: /Confirmar pedido/ }).click();
await page.getByRole("heading", { name: "Pedido confirmado" }).waitFor({ timeout: 60_000 });
const orderId = new URL(page.url()).searchParams.get("pedido");
await browser.close();

const serviceKey = resolveSupabaseServiceRoleKey();
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
if (orderId) {
  await admin.from("order_items").delete().eq("order_id", orderId);
  await admin.from("orders").delete().eq("id", orderId);
}
const { data: users } = await admin.auth.admin.listUsers({ perPage: 200 });
const u = users.users.find((x) => x.email === email);
if (u) {
  const { data: ords } = await admin.from("orders").select("id").eq("user_id", u.id);
  for (const o of ords ?? []) {
    await admin.from("order_items").delete().eq("order_id", o.id);
    await admin.from("orders").delete().eq("id", o.id);
  }
  await admin.from("cart_items").delete().eq("user_id", u.id);
  await admin.auth.admin.deleteUser(u.id);
}
const { data: sw } = await admin.from("products").select("stock").eq("slug", "smartwatch-pro").single();
await admin.from("products").update({ stock: 15 }).eq("slug", "smartwatch-pro");

console.log(JSON.stringify({ ok: true, wwwCheckoutUi: true, orderId, smartwatchStock: sw?.stock }));
