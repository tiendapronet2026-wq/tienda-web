/** Proyecto Supabase autorizado para TiendaPro (operaciones destructivas solo aquí). */
export const TIENDAPRO_SUPABASE_PROJECT_REF = "dnptsudsxrcamtxfiszh";

/** Referencia obsoleta — no usar en URLs ni operaciones. */
export const DEPRECATED_SUPABASE_PROJECT_REF = "lwenyboejvwuopsenrwx";

export function getSupabaseProjectRefFromUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.split(".")[0] || null;
  } catch {
    return null;
  }
}

export function isAuthorizedTiendaProSupabaseUrl(url: string | undefined): boolean {
  return getSupabaseProjectRefFromUrl(url) === TIENDAPRO_SUPABASE_PROJECT_REF;
}
