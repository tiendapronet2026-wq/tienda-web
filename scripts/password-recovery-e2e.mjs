/**
 * E2E recuperación de contraseña (cuenta temporal, sin tocar admin).
 * Requiere Supabase CLI autenticado o SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_* en env.
 */
import { execSync } from "node:child_process";
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { resolveSupabaseServiceRoleKey } from "./supabase-service-role.mjs";

const projectRef = "dnptsudsxrcamtxfiszh";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? `https://${projectRef}.supabase.co`;

function resolveAnonKey() {
  const fromEnv = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (fromEnv && fromEnv.length > 20) return fromEnv;
  const raw = execSync(
    `npx supabase@2.117.0 projects api-keys --project-ref ${projectRef}`,
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
  );
  return JSON.parse(raw).keys.find((k) => k.id === "anon").api_key;
}

const base =
  process.env.PASSWORD_RECOVERY_E2E_BASE_URL?.replace(/\/$/, "") ??
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://www.tiendapro.net";

const serviceKey = resolveSupabaseServiceRoleKey();
const anonKey = resolveAnonKey();

if (!serviceKey || !anonKey) {
  console.error("Faltan claves Supabase para E2E.");
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const anon = createClient(supabaseUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const stamp = Date.now();
const email = `pwd-recovery-e2e-${stamp}@tiendapro.local`;
const tempPassword = `Temp-${stamp}!aA1`;
const newPassword = `New-${stamp}!bB2`;

const redirectTo = `${base}/auth/callback?next=${encodeURIComponent("/actualizar-password")}`;

const { data: created, error: createErr } = await admin.auth.admin.createUser({
  email,
  password: tempPassword,
  email_confirm: true,
});
if (createErr) {
  console.error("createUser:", createErr.message);
  process.exit(1);
}
const userId = created.user.id;

try {
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo },
  });
  if (linkErr || !linkData?.properties?.action_link) {
    console.error("generateLink:", linkErr?.message ?? "sin action_link");
    process.exit(1);
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(linkData.properties.action_link, { waitUntil: "networkidle", timeout: 120_000 });

  await page.waitForURL(/actualizar-password/, { timeout: 120_000 });
  await page.getByLabel("Nueva contraseña").waitFor({ timeout: 60_000 });
  await page.getByLabel("Nueva contraseña").fill(newPassword);
  await page.getByRole("button", { name: "Actualizar contraseña" }).click();
  await page.waitForURL(/login.*password-actualizado/, { timeout: 60_000 });

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(newPassword);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL(/mi-cuenta|control|acceso-denegado/, { timeout: 60_000 });

  const { error: signInErr } = await anon.auth.signInWithPassword({
    email,
    password: newPassword,
  });
  if (signInErr) {
    console.error("signIn post-reset:", signInErr.message);
    process.exit(1);
  }

  await browser.close();
  console.log("PASSWORD_RECOVERY_E2E=PASS");
} finally {
  await admin.auth.admin.deleteUser(userId);
}
