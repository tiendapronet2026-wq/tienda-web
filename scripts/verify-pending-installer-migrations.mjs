#!/usr/bin/env node
/**
 * Verificador confiable — proyecto exclusivo dnptsudsxrcamtxfiszh.
 */
import { createClient } from "@supabase/supabase-js";

const MANUAL =
  "En Supabase Dashboard → SQL Editor del proyecto dnptsudsxrcamtxfiszh, ejecutá de una sola vez el archivo scripts/manual-apply-pending-migrations-dnptsudsxrcamtxfiszh.sql y volvé a correr: node scripts/verify-pending-installer-migrations.mjs";

function evaluateInstallerSchemaHealth(health) {
  const expectedVersions = ["20260920213000", "20260920220000", "20260920230000", "20260920232000"];
  const mig = health?.migration_versions ?? {};
  const missingMigrations = expectedVersions.filter((v) => !mig[v]);

  const checks = [
    { id: "project_ref", ok: health?.project_ref === "dnptsudsxrcamtxfiszh" },
    {
      id: "migration_history",
      ok: missingMigrations.length === 0,
      detail: missingMigrations.length ? `Faltan: ${missingMigrations.join(", ")}` : undefined,
    },
    { id: "branding_reference", ok: health?.branding_reference_ok === true },
    { id: "grants_table", ok: health?.table_installation_resource_grants_exists === true },
    { id: "resource_tier_column", ok: health?.column_resource_tier_exists === true },
    {
      id: "lifecycle_preview_validated",
      ok: health?.lifecycle_includes_preview_validated === true,
      detail: health?.lifecycle_constraint,
    },
    {
      id: "sql_grants_insert_update",
      ok: health?.grants_has_insert_update === true,
      detail: JSON.stringify(health?.grants_authenticated_privileges ?? []),
    },
    {
      id: "rls_insert_update_policies",
      ok: health?.policies_include_insert_update === true,
      detail: JSON.stringify(health?.policies_installation_resource_grants ?? []),
    },
    {
      id: "control_functions",
      ok: health?.is_control_owner_defined === true && health?.is_control_operator_defined === true,
    },
  ];

  return { ok: checks.every((c) => c.ok), checks };
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  console.error(MANUAL);
  process.exit(2);
}

if (!url.includes("dnptsudsxrcamtxfiszh")) {
  console.error("URL debe ser del proyecto dnptsudsxrcamtxfiszh exclusivamente.");
  process.exit(2);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const { data: health, error } = await supabase.rpc("control_installer_schema_health");

if (error) {
  console.error("RPC control_installer_schema_health no disponible:", error.message);
  console.error(MANUAL);
  process.exit(1);
}

const result = evaluateInstallerSchemaHealth(health);

for (const c of result.checks) {
  console.log(`${c.ok ? "OK" : "FALLO"} — ${c.id}${c.detail ? ` (${c.detail})` : ""}`);
}

if (result.ok) {
  console.log("\nEsquema instalador + historial de migraciones: CONSISTENTE (dnptsudsxrcamtxfiszh).");
  process.exit(0);
}

console.error("\n", MANUAL);
process.exit(1);
