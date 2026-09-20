/**
 * Evalúa el JSON de control_installer_schema_health() (dnptsudsxrcamtxfiszh).
 */
export type InstallerSchemaHealth = Record<string, unknown> & {
  project_ref?: string;
  migration_versions?: Record<string, string>;
  lifecycle_constraint?: string;
  lifecycle_includes_preview_validated?: boolean;
  grants_authenticated_privileges?: string[];
  grants_has_insert_update?: boolean;
  policies_installation_resource_grants?: unknown;
  policies_include_insert_update?: boolean;
  is_control_owner_defined?: boolean;
  is_control_operator_defined?: boolean;
  table_installation_resource_grants_exists?: boolean;
  column_resource_tier_exists?: boolean;
  branding_reference_ok?: boolean;
};

export function evaluateInstallerSchemaHealth(health: InstallerSchemaHealth | null | undefined) {
  const expectedVersions = ["20260920213000", "20260920220000", "20260920230000", "20260920232000"];
  const mig = health?.migration_versions ?? {};
  const missingMigrations = expectedVersions.filter((v) => !mig[v]);

  const checks = [
    {
      id: "project_ref",
      ok: health?.project_ref === "dnptsudsxrcamtxfiszh",
      detail: health?.project_ref,
    },
    {
      id: "migration_history",
      ok: missingMigrations.length === 0,
      detail: missingMigrations.length ? `Faltan: ${missingMigrations.join(", ")}` : undefined,
    },
    {
      id: "branding_reference",
      ok: health?.branding_reference_ok === true,
    },
    {
      id: "grants_table",
      ok: health?.table_installation_resource_grants_exists === true,
    },
    {
      id: "resource_tier_column",
      ok: health?.column_resource_tier_exists === true,
    },
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
      ok:
        health?.is_control_owner_defined === true && health?.is_control_operator_defined === true,
    },
  ];

  return {
    ok: checks.every((c) => c.ok),
    checks,
  };
}
