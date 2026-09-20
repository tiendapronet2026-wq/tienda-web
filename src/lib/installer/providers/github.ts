import { assertAuthorizedTarget } from "@/lib/installer/providers/authorized";
import type { ProviderVerifyResult } from "@/lib/installer/providers/types";

export async function verifyGithubRepoAccess(repo: string | undefined): Promise<ProviderVerifyResult> {
  if (!repo?.includes("/")) {
    return { ok: false, status: "failed", message: "Formato repo: org/nombre" };
  }

  const allowErr = assertAuthorizedTarget("github", repo);
  if (allowErr) return { ok: false, status: "failed", message: allowErr };

  const token = process.env.INSTALLER_GITHUB_TOKEN?.trim();
  if (!token) {
    return {
      ok: false,
      status: "skipped",
      message: "GitHub: INSTALLER_GITHUB_TOKEN no configurado en servidor",
    };
  }

  const res = await fetch(`https://api.github.com/repos/${repo}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "TiendaPro-Installer",
    },
    cache: "no-store",
  });

  if (res.status === 404) {
    return { ok: false, status: "failed", message: "Repositorio no encontrado o sin permiso de lectura" };
  }
  if (!res.ok) {
    return { ok: false, status: "failed", message: `GitHub API HTTP ${res.status}` };
  }

  const body = (await res.json()) as { full_name?: string; private?: boolean };
  return {
    ok: true,
    status: "ok",
    message: `Repo vinculado: ${body.full_name ?? repo}${body.private ? " (privado)" : ""}`,
  };
}
