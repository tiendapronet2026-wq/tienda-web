/** Recursos cloud autorizados para pruebas de vinculación TiendaPro (no Casa León ni legacy). */
export const TIENDAPRO_AUTHORIZED_LINK_TARGETS = {
  githubRepo: "tiendapronet2026-wq/tienda-web",
  vercelProject: "tienda-web",
  supabaseProjectRef: "dnptsudsxrcamtxfiszh",
} as const;

export function isStrictAuthorizedOnly(): boolean {
  return process.env.INSTALLER_AUTHORIZED_ONLY !== "0";
}

export function assertAuthorizedTarget(kind: "github" | "vercel" | "supabase", value: string): string | null {
  if (!isStrictAuthorizedOnly()) return null;
  const normalized = value.trim().toLowerCase();
  if (kind === "github" && normalized !== TIENDAPRO_AUTHORIZED_LINK_TARGETS.githubRepo.toLowerCase()) {
    return `GitHub: solo ${TIENDAPRO_AUTHORIZED_LINK_TARGETS.githubRepo} en modo validación.`;
  }
  if (kind === "vercel" && normalized !== TIENDAPRO_AUTHORIZED_LINK_TARGETS.vercelProject.toLowerCase()) {
    return `Vercel: solo proyecto ${TIENDAPRO_AUTHORIZED_LINK_TARGETS.vercelProject} en modo validación.`;
  }
  if (kind === "supabase" && normalized !== TIENDAPRO_AUTHORIZED_LINK_TARGETS.supabaseProjectRef.toLowerCase()) {
    return `Supabase: solo ref ${TIENDAPRO_AUTHORIZED_LINK_TARGETS.supabaseProjectRef} en modo validación.`;
  }
  return null;
}
