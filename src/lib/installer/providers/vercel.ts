import { assertAuthorizedTarget } from "@/lib/installer/providers/authorized";
import type { ProviderVerifyResult } from "@/lib/installer/providers/types";

export async function verifyVercelProjectAccess(project: string | undefined): Promise<ProviderVerifyResult> {
  if (!project?.trim()) {
    return { ok: false, status: "failed", message: "Nombre de proyecto Vercel requerido" };
  }

  const allowErr = assertAuthorizedTarget("vercel", project);
  if (allowErr) return { ok: false, status: "failed", message: allowErr };

  const token = process.env.INSTALLER_VERCEL_TOKEN?.trim();
  if (!token) {
    return {
      ok: false,
      status: "skipped",
      message: "Vercel: INSTALLER_VERCEL_TOKEN no configurado en servidor",
    };
  }

  const teamId = process.env.INSTALLER_VERCEL_TEAM_ID?.trim();
  const qs = teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";
  const res = await fetch(`https://api.vercel.com/v9/projects/${encodeURIComponent(project)}${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (res.status === 404) {
    return { ok: false, status: "failed", message: "Proyecto Vercel no encontrado o sin acceso" };
  }
  if (!res.ok) {
    return { ok: false, status: "failed", message: `Vercel API HTTP ${res.status}` };
  }

  const body = (await res.json()) as { name?: string };
  return { ok: true, status: "ok", message: `Proyecto Vercel: ${body.name ?? project}` };
}
