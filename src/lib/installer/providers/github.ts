import type { InstallationResourceGrant } from "@/lib/installer/grants";
import { assertAuthorizedTarget } from "@/lib/installer/providers/authorized";
import type { ProviderVerifyResult } from "@/lib/installer/providers/types";

function githubToken(): string | null {
  return process.env.INSTALLER_GITHUB_TOKEN?.trim() || null;
}

export async function verifyGithubRepoAccess(
  repo: string | undefined,
  grant?: InstallationResourceGrant | null
): Promise<ProviderVerifyResult> {
  if (!repo?.includes("/")) {
    return { ok: false, status: "failed", message: "Formato repo: org/nombre" };
  }

  const allowErr = assertAuthorizedTarget("github", repo, grant);
  if (allowErr) return { ok: false, status: "failed", message: allowErr };

  const token = githubToken();
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

export async function verifyTemplateArtifactInRepo(
  repo: string,
  templateId: string,
  grant?: InstallationResourceGrant | null
): Promise<ProviderVerifyResult> {
  const base = await verifyGithubRepoAccess(repo, grant);
  if (!base.ok) return base;

  const token = githubToken();
  if (!token) return { ok: false, status: "skipped", message: "GitHub token ausente" };

  const path = `templates/${templateId}/template.manifest.json`;
  const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "TiendaPro-Installer",
    },
    cache: "no-store",
  });

  if (res.status === 404) {
    return { ok: false, status: "failed", message: `Plantilla ${templateId} no encontrada en ${repo}` };
  }
  if (!res.ok) {
    return { ok: false, status: "failed", message: `GitHub contents HTTP ${res.status}` };
  }

  return { ok: true, status: "ok", message: `Plantilla ${templateId} presente en repositorio` };
}

export async function ensureGitBranchFromDefault(
  repo: string,
  branch: string,
  defaultBranch = "master"
): Promise<ProviderVerifyResult> {
  const token = githubToken();
  if (!token) {
    return { ok: false, status: "skipped", message: "GitHub token ausente" };
  }

  const headRes = await fetch(`https://api.github.com/repos/${repo}/git/ref/heads/${defaultBranch}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "TiendaPro-Installer",
    },
    cache: "no-store",
  });

  if (!headRes.ok) {
    return { ok: false, status: "failed", message: `No se pudo leer rama ${defaultBranch}` };
  }

  const head = (await headRes.json()) as { object?: { sha?: string } };
  const sha = head.object?.sha;
  if (!sha) return { ok: false, status: "failed", message: "SHA de rama base inválido" };

  const existing = await fetch(`https://api.github.com/repos/${repo}/git/ref/heads/${branch}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "TiendaPro-Installer",
    },
    cache: "no-store",
  });

  if (existing.ok) {
    return { ok: true, status: "ok", message: `Rama ${branch} ya existe (idempotente)` };
  }

  const create = await fetch(`https://api.github.com/repos/${repo}/git/refs`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "TiendaPro-Installer",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha }),
  });

  if (create.status === 422) {
    return { ok: true, status: "ok", message: `Rama ${branch} ya creada` };
  }
  if (!create.ok) {
    return { ok: false, status: "failed", message: `No se pudo crear rama ${branch} (HTTP ${create.status})` };
  }

  return { ok: true, status: "ok", message: `Rama ${branch} preparada desde ${defaultBranch}` };
}
