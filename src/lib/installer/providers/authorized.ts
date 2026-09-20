import type { InstallationResourceGrant } from "@/lib/installer/grants";

/** Recursos de referencia TiendaPro (vinculación / primera instalación con infra existente). */
export const TIENDAPRO_AUTHORIZED_LINK_TARGETS = {
  githubRepo: "tiendapronet2026-wq/tienda-web",
  vercelProject: "tienda-web",
  supabaseProjectRef: "dnptsudsxrcamtxfiszh",
} as const;

/** Allowlist global siempre activa (no desactivar vía env). */
export function isStrictAuthorizedOnly(): boolean {
  return true;
}

function matchesGlobalTarget(kind: "github" | "vercel" | "supabase", value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (kind === "github") {
    return normalized === TIENDAPRO_AUTHORIZED_LINK_TARGETS.githubRepo.toLowerCase();
  }
  if (kind === "vercel") {
    return normalized === TIENDAPRO_AUTHORIZED_LINK_TARGETS.vercelProject.toLowerCase();
  }
  return normalized === TIENDAPRO_AUTHORIZED_LINK_TARGETS.supabaseProjectRef.toLowerCase();
}

function matchesGrantTarget(
  kind: "github" | "vercel" | "supabase",
  value: string,
  grant: InstallationResourceGrant
): boolean {
  const normalized = value.trim().toLowerCase();
  if (kind === "github") return normalized === grant.githubRepo.toLowerCase();
  if (kind === "vercel") return normalized === grant.vercelProject.toLowerCase();
  return normalized === grant.supabaseProjectRef.toLowerCase();
}

/**
 * Autorización explícita: recurso global TiendaPro O grant activo de la instalación (debe coincidir exactamente).
 */
export function assertAuthorizedTarget(
  kind: "github" | "vercel" | "supabase",
  value: string,
  grant?: InstallationResourceGrant | null
): string | null {
  if (!value?.trim()) {
    return `${kind}: valor requerido`;
  }
  if (matchesGlobalTarget(kind, value)) {
    return null;
  }
  if (grant && matchesGrantTarget(kind, value, grant)) {
    return null;
  }
  if (grant) {
    return `${kind}: recurso no coincide con la autorización registrada para esta instalación.`;
  }
  return `${kind}: recurso no autorizado. Definí un grant en Control o usá infra TiendaPro autorizada.`;
}
