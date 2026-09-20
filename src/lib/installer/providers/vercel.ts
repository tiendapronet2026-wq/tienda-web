import type { InstallationResourceGrant } from "@/lib/installer/grants";
import { assertAuthorizedTarget } from "@/lib/installer/providers/authorized";
import type { ProviderVerifyResult } from "@/lib/installer/providers/types";

function vercelToken(): string | null {
  return process.env.INSTALLER_VERCEL_TOKEN?.trim() || null;
}

function teamQuery(): string {
  const teamId = process.env.INSTALLER_VERCEL_TEAM_ID?.trim();
  return teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";
}

export async function verifyVercelProjectAccess(
  project: string | undefined,
  grant?: InstallationResourceGrant | null
): Promise<ProviderVerifyResult> {
  if (!project?.trim()) {
    return { ok: false, status: "failed", message: "Nombre de proyecto Vercel requerido" };
  }

  const allowErr = assertAuthorizedTarget("vercel", project, grant);
  if (allowErr) return { ok: false, status: "failed", message: allowErr };

  const token = vercelToken();
  if (!token) {
    return {
      ok: false,
      status: "skipped",
      message: "Vercel: INSTALLER_VERCEL_TOKEN no configurado en servidor",
    };
  }

  const res = await fetch(`https://api.vercel.com/v9/projects/${encodeURIComponent(project)}${teamQuery()}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (res.status === 404) {
    return { ok: false, status: "failed", message: "Proyecto Vercel no encontrado o sin acceso" };
  }
  if (!res.ok) {
    return { ok: false, status: "failed", message: `Vercel API HTTP ${res.status}` };
  }

  const body = (await res.json()) as { name?: string; id?: string };
  return { ok: true, status: "ok", message: `Proyecto Vercel: ${body.name ?? project}` };
}

export async function getVercelProjectId(project: string): Promise<string | null> {
  const token = vercelToken();
  if (!token) return null;
  const res = await fetch(`https://api.vercel.com/v9/projects/${encodeURIComponent(project)}${teamQuery()}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { id?: string };
  return body.id ?? null;
}

type EnvTarget = "production" | "preview" | "development";

export async function upsertVercelEnvVar(input: {
  projectId: string;
  key: string;
  value: string;
  targets: EnvTarget[];
  gitBranch?: string;
}): Promise<ProviderVerifyResult> {
  const token = vercelToken();
  if (!token) return { ok: false, status: "skipped", message: "Vercel token ausente" };

  const list = await fetch(
    `https://api.vercel.com/v9/projects/${input.projectId}/env${teamQuery()}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );
  if (!list.ok) {
    return { ok: false, status: "failed", message: `List env HTTP ${list.status}` };
  }

  const envs = (await list.json()) as { envs?: Array<{ id: string; key: string; gitBranch?: string | null }> };
  const existing = envs.envs?.find(
    (e) => e.key === input.key && (input.gitBranch ? e.gitBranch === input.gitBranch : !e.gitBranch)
  );

  const body = {
    key: input.key,
    value: input.value,
    type: "encrypted",
    target: input.targets,
    gitBranch: input.gitBranch,
  };

  if (existing) {
    const patch = await fetch(
      `https://api.vercel.com/v9/projects/${input.projectId}/env/${existing.id}${teamQuery()}`,
      {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    if (!patch.ok) {
      return { ok: false, status: "failed", message: `Actualizar env ${input.key} HTTP ${patch.status}` };
    }
    return { ok: true, status: "ok", message: `Variable ${input.key} actualizada (rama ${input.gitBranch ?? "default"})` };
  }

  const create = await fetch(`https://api.vercel.com/v10/projects/${input.projectId}/env${teamQuery()}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!create.ok) {
    return { ok: false, status: "failed", message: `Crear env ${input.key} HTTP ${create.status}` };
  }
  return { ok: true, status: "ok", message: `Variable ${input.key} configurada` };
}

export async function createVercelDeployment(input: {
  project: string;
  repo: string;
  ref: string;
}): Promise<ProviderVerifyResult & { deploymentUrl?: string }> {
  const token = vercelToken();
  if (!token) return { ok: false, status: "skipped", message: "Vercel token ausente" };

  const [org, repoName] = input.repo.split("/");
  if (!org || !repoName) {
    return { ok: false, status: "failed", message: "Repo GitHub inválido para deploy" };
  }

  const res = await fetch(`https://api.vercel.com/v13/deployments${teamQuery()}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: input.project,
      project: input.project,
      target: "preview",
      gitSource: {
        type: "github",
        org,
        repo: repoName,
        ref: input.ref,
      },
    }),
  });

  if (!res.ok) {
    return { ok: false, status: "failed", message: `Deploy Vercel HTTP ${res.status}` };
  }

  const body = (await res.json()) as { url?: string; readyState?: string; id?: string };
  const deploymentUrl = body.url ? `https://${body.url}` : undefined;
  return {
    ok: true,
    status: "ok",
    message: `Deploy iniciado${deploymentUrl ? `: ${deploymentUrl}` : ""}`,
    deploymentUrl,
  };
}

export async function verifyVercelDomainAttached(
  project: string,
  domain: string
): Promise<ProviderVerifyResult> {
  const token = vercelToken();
  if (!token) return { ok: false, status: "skipped", message: "Vercel token ausente" };

  const res = await fetch(
    `https://api.vercel.com/v9/projects/${encodeURIComponent(project)}/domains${teamQuery()}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );
  if (!res.ok) {
    return { ok: false, status: "failed", message: `List domains HTTP ${res.status}` };
  }
  const body = (await res.json()) as { domains?: Array<{ name: string }> };
  const found = body.domains?.some((d) => d.name.toLowerCase() === domain.toLowerCase());
  if (!found) {
    return {
      ok: false,
      status: "failed",
      message: `Dominio ${domain} no está asociado al proyecto (sin cambios DNS)`,
    };
  }
  return { ok: true, status: "ok", message: `Dominio ${domain} verificado en proyecto Vercel` };
}
