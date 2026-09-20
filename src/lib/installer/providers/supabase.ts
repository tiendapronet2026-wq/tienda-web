import { assertAuthorizedTarget } from "@/lib/installer/providers/authorized";
import type { ProviderVerifyResult } from "@/lib/installer/providers/types";

export async function verifySupabaseProjectAccess(projectRef: string | undefined): Promise<ProviderVerifyResult> {
  if (!projectRef?.trim()) {
    return { ok: false, status: "failed", message: "Project ref Supabase requerido" };
  }

  const allowErr = assertAuthorizedTarget("supabase", projectRef);
  if (allowErr) return { ok: false, status: "failed", message: allowErr };

  const token = process.env.INSTALLER_SUPABASE_ACCESS_TOKEN?.trim();
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
