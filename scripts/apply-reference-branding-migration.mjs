#!/usr/bin/env node
/**
 * Verifica/aplica branding referencia (migración 20260920213000) sin db push masivo.
 * Si falta, imprime el SQL exacto para el SQL Editor (proyecto dnptsudsxrcamtxfiszh).
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationPath = join(__dirname, "../supabase/migrations/20260920213000_reference_branding_runtime.sql");
const sql = readFileSync(migrationPath, "utf8");

if (!url || !key) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  console.log("--- SQL manual ---\n", sql);
  process.exit(2);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const { data: row, error } = await supabase
  .from("platform_installations")
  .select("branding_config")
  .eq("company_slug", "tiendapro-reference")
  .maybeSingle();

if (error) {
  console.error(error.message);
  process.exit(2);
}

const cfg = row?.branding_config ?? {};
if (cfg.brandName === "TiendaPro" && cfg.primaryColor === "#0a8f5c" && cfg.logoUrl) {
  console.log("OK: branding referencia aplicado (brandName, primaryColor, logoUrl).");
  process.exit(0);
}

console.error("PENDIENTE: migración 20260920213000_reference_branding_runtime.sql no aplicada en dnptsudsxrcamtxfiszh.");
console.log("Ejecutá en SQL Editor (solo este archivo):\n");
console.log(sql);
process.exit(1);
