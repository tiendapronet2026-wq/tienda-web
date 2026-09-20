import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { resolveSupabaseServiceRoleKey } from "../scripts/supabase-service-role.mjs";

export const CREDS_PATH = path.join(__dirname, ".e2e-creds.json");

export default async function globalSetup() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://dnptsudsxrcamtxfiszh.supabase.co";
  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    (() => {
      throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY requerida para global-setup");
    })();

  const stamp = Date.now();
  const customerEmail = `e2e-checkout-${stamp}@tiendapro.local`;
  const adminEmail = `e2e-admin-test-${stamp}@tiendapro.local`;
  const password = `E2ePass-${stamp}!aA1`;

  const anonClient = createClient(url, anon, { auth: { persistSession: false } });

  async function ensureUser(email: string) {
    const { data, error } = await anonClient.auth.signUp({
      email,
      password,
      options: { data: { first_name: "E2E", last_name: "Checkout" } },
    });
    if (error && !error.message.includes("already registered")) {
      throw new Error(`signUp ${email}: ${error.message}`);
    }
    return data.user?.id ?? null;
  }

  const customerId = await ensureUser(customerEmail);
  const adminId = await ensureUser(adminEmail);

  const { data: product } = await anonClient
    .from("products")
    .select("id, slug, stock, price")
    .eq("slug", "smartwatch-pro")
    .maybeSingle();

  if (!product) {
    throw new Error("Producto smartwatch-pro no encontrado para E2E");
  }

  fs.writeFileSync(
    CREDS_PATH,
    JSON.stringify(
      {
        customerEmail,
        adminEmail,
        password,
        customerId,
        adminId,
        productSlug: product.slug,
        productId: product.id,
        stockBefore: product.stock,
        expectedPrice: Number(product.price),
      },
      null,
      2
    )
  );

  const serviceKey = resolveSupabaseServiceRoleKey();
  if (serviceKey && adminId) {
    const adminClient = createClient(url, serviceKey, { auth: { persistSession: false } });
    await adminClient.from("profiles").upsert({
      id: adminId,
      first_name: "E2E",
      last_name: "AdminTest",
      role: "admin",
      status: "active",
    });
  }
}
