#!/usr/bin/env node
/**
 * Verifica migraciones pendientes del instalador en dnptsudsxrcamtxfiszh (solo lectura vía API).
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const __dirname = dirname(fileURLToPath(import.meta.url));

const checks = [];

if (!url || !key) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  console.log("Operación manual: scripts/manual-apply-pending-migrations-dnptsudsxrcamtxfiszh.sql");
  process.exit(2);
}

if (!url.includes("dnptsudsxrcamtxfiszh")) {
  console.error("Este script solo debe apuntar al proyecto TiendaPro dnptsudsxrcamtxfiszh.");
  process.exit(2);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const { data: brandingRow, error: bErr } = await supabase
  .from("platform_installations")
  .select("branding_config")
  .eq("company_slug", "tiendapro-reference")
  .maybeSingle();

if (bErr) {
  console.error(bErr.message);
  process.exit(2);
}

const cfg = brandingRow?.branding_config ?? {};
const brandingOk =
  cfg.brandName === "TiendaPro" && cfg.primaryColor === "#0a8f5c" && Boolean(cfg.logoUrl);
checks.push({ id: "20260920213000_reference_branding_runtime", ok: brandingOk });

const { error: grantsErr } = await supabase.from("installation_resource_grants").select("id").limit(1);
const grantsOk = !grantsErr;
checks.push({
  id: "20260920220000_installation_resource_grants",
  ok: grantsOk,
  detail: grantsErr?.message,
});

let lifecycleOk = false;
if (grantsOk) {
  const { error: tierErr } = await supabase.from("installation_resource_grants").select("resource_tier").limit(1);
  lifecycleOk = !tierErr;
}
checks.push({
  id: "20260920230000_installation_preview_validated",
  ok: lifecycleOk,
  detail: lifecycleOk ? undefined : "Columna resource_tier o lifecycle preview_validated pendiente",
});

for (const c of checks) {
  console.log(`${c.ok ? "OK" : "PENDIENTE"} — ${c.id}${c.detail ? ` (${c.detail})` : ""}`);
}

if (checks.every((c) => c.ok)) {
  console.log("\nMigraciones instalador verificadas en dnptsudsxrcamtxfiszh.");
  process.exit(0);
}

console.log("\nAplicación manual (propietario): scripts/manual-apply-pending-migrations-dnptsudsxrcamtxfiszh.sql");
process.exit(1);
