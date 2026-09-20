import type { InstallationResourceGrant } from "@/lib/installer/grants";
import { assertAuthorizedTarget, TIENDAPRO_AUTHORIZED_LINK_TARGETS } from "@/lib/installer/providers/authorized";
import type { ProviderVerifyResult } from "@/lib/installer/providers/types";

const PLATFORM_MIGRATION_VERSIONS = ["20260920180000", "20260920213000"] as const;
const CLIENT_STORE_MIGRATION_VERSIONS = ["20260920120000", "20260920133000", "20260920140000"] as const;

function supabaseMgmtToken(): string | null {
  return process.env.INSTALLER_SUPABASE_ACCESS_TOKEN?.trim() || null;
}

export async function verifySupabaseProjectAccess(
  projectRef: string | undefined,
  grant?: InstallationResourceGrant | null
): Promise<ProviderVerifyResult> {
  if (!projectRef?.trim()) {
    return { ok: false, status: "failed", message: "Project ref Supabase requerido" };
  }

  const allowErr = assertAuthorizedTarget("supabase", projectRef, grant);
  if (allowErr) return { ok: false, status: "failed", message: allowErr };

  const token = supabaseMgmtToken();
  if (!token) {
    return {
      ok: false,
      status: "skipped",
      message: "Supabase: INSTALLER_SUPABASE_ACCESS_TOKEN no configurado en servidor",
    };
  }

  const res = await fetch(`https://api.supabase.com/v1/projects/${encodeURIComponent(projectRef)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (res.status === 404) {
    return { ok: false, status: "failed", message: "Proyecto Supabase no encontrado o sin acceso" };
  }
  if (!res.ok) {
    return { ok: false, status: "failed", message: `Supabase Management API HTTP ${res.status}` };
  }

  const body = (await res.json()) as { name?: string; id?: string };
  return {
    ok: true,
    status: "ok",
    message: `Supabase: ${body.name ?? projectRef} (${body.id ?? projectRef})`,
  };
}

/** Solo verifica migraciones ya aplicadas (no ejecuta db push masivo). */
export async function verifySupabaseMigrationsPresent(
  projectRef: string,
  grant?: InstallationResourceGrant | null
): Promise<ProviderVerifyResult> {
  const base = await verifySupabaseProjectAccess(projectRef, grant);
  if (!base.ok) return base;

  const token = supabaseMgmtToken();
  if (!token) return { ok: false, status: "skipped", message: "Supabase token ausente" };

  const res = await fetch(`https://api.supabase.com/v1/projects/${encodeURIComponent(projectRef)}/database/migrations`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    return { ok: false, status: "failed", message: `List migrations HTTP ${res.status}` };
  }

  const rows = (await res.json()) as Array<{ name?: string; version?: string }>;
  const versions = new Set(rows.map((r) => String(r.version ?? "")));

  const isPlatformProject = projectRef === TIENDAPRO_AUTHORIZED_LINK_TARGETS.supabaseProjectRef;
  const required = isPlatformProject ? PLATFORM_MIGRATION_VERSIONS : CLIENT_STORE_MIGRATION_VERSIONS;
  const missing = required.filter((v) => !versions.has(v));

  if (missing.length) {
    return {
      ok: false,
      status: "failed",
      message: `Migraciones requeridas ausentes (versiones): ${missing.join(", ")}`,
    };
  }

  return {
    ok: true,
    status: "ok",
    message: isPlatformProject
      ? "Migraciones plataforma/tienda verificadas"
      : "Migraciones tienda (schema cliente) verificadas",
  };
}
