import { describe, expect, it } from "vitest";
import { evaluateInstallerSchemaHealth } from "@/lib/installer/schema-health";

describe("evaluateInstallerSchemaHealth", () => {
  it("falla si faltan versiones en schema_migrations", () => {
    const r = evaluateInstallerSchemaHealth({
      project_ref: "dnptsudsxrcamtxfiszh",
      migration_versions: { "20260920213000": "reference_branding_runtime" },
      branding_reference_ok: true,
      table_installation_resource_grants_exists: true,
      column_resource_tier_exists: true,
      lifecycle_includes_preview_validated: true,
      grants_has_insert_update: true,
      policies_include_insert_update: true,
      is_control_owner_defined: true,
      is_control_operator_defined: true,
    });
    expect(r.ok).toBe(false);
    expect(r.checks.find((c) => c.id === "migration_history")?.ok).toBe(false);
  });

  it("ok con health completo", () => {
    const r = evaluateInstallerSchemaHealth({
      project_ref: "dnptsudsxrcamtxfiszh",
      migration_versions: {
        "20260920213000": "reference_branding_runtime",
        "20260920220000": "installation_resource_grants",
        "20260920230000": "installation_preview_validated",
        "20260920232000": "installer_schema_health_rpc",
      },
      branding_reference_ok: true,
      table_installation_resource_grants_exists: true,
      column_resource_tier_exists: true,
      lifecycle_includes_preview_validated: true,
      grants_has_insert_update: true,
      policies_include_insert_update: true,
      is_control_owner_defined: true,
      is_control_operator_defined: true,
    });
    expect(r.ok).toBe(true);
  });
});
