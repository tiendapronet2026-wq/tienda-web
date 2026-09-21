import type { BridgeTaskResultReport, BridgeTaskStatus } from "@/lib/bridge/constants";
import { BRIDGE_AUTHORIZED_GITHUB_REPO } from "@/lib/bridge/constants";

const SECRET_PATTERNS: RegExp[] = [
  /\bghs_[A-Za-z0-9_]{20,}\b/g,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g,
  /\bghp_[A-Za-z0-9]{20,}\b/g,
  /\bsk-[A-Za-z0-9]{20,}\b/g,
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
  /\bBRIDGE_API_SECRET\s*[:=]\s*\S+/gi,
  /\bSUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*\S+/gi,
  /\bBearer\s+[A-Za-z0-9._-]{16,}/gi,
];

export function redactSensitiveText(input: string): string {
  let out = input;
  for (const pattern of SECRET_PATTERNS) {
    out = out.replace(pattern, "[REDACTED]");
  }
  return out;
}

export function parseAuthorizedPullRequestUrl(
  prUrl: string | null | undefined
): { owner: string; repo: string; pullNumber: number } | null {
  if (!prUrl?.trim()) return null;
  let url: URL;
  try {
    url = new URL(prUrl.trim());
  } catch {
    return null;
  }
  if (url.hostname !== "github.com") return null;
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 4 || parts[2] !== "pull") return null;
  const [owner, repo, , pullRaw] = parts;
  const pullNumber = Number(pullRaw);
  if (!Number.isInteger(pullNumber) || pullNumber < 1) return null;
  const full = `${owner}/${repo}`.toLowerCase();
  if (full !== BRIDGE_AUTHORIZED_GITHUB_REPO.toLowerCase()) return null;
  return { owner, repo, pullNumber };
}

export function getGitHubBridgeToken(): string | null {
  return (
    process.env.GITHUB_BRIDGE_TOKEN?.trim() ||
    process.env.INSTALLER_GITHUB_TOKEN?.trim() ||
    null
  );
}

export function formatBridgeReportCommentMarkdown(input: {
  taskId: string;
  taskTitle: string;
  taskStatus: BridgeTaskStatus;
  report: BridgeTaskResultReport;
}): string {
  const { taskId, taskTitle, taskStatus, report } = input;
  const lines: string[] = [
    "## Informe puente TiendaPro",
    "",
    `**Tarea:** ${redactSensitiveText(taskTitle)}`,
    `**Task ID:** \`${taskId}\``,
    `**Estado:** ${taskStatus}`,
  ];

  if (report.trustLevel) {
    lines.push(`**Confianza del informe:** ${report.trustLevel}`);
  }
  if (report.testsVerified != null) {
    lines.push(`**Pruebas verificadas en servidor:** ${report.testsVerified ? "sí" : "no"}`);
  }

  lines.push("", "### Resumen", redactSensitiveText(report.summary ?? "—"));

  const files = report.filesChanged ?? [];
  lines.push("", "### Cambios");
  if (files.length) {
    for (const f of files.slice(0, 40)) {
      lines.push(`- \`${redactSensitiveText(f)}\``);
    }
    if (files.length > 40) lines.push(`- _… y ${files.length - 40} archivos más_`);
  } else {
    lines.push("_Sin archivos listados_");
  }

  lines.push("", "### Pruebas");
  const tests = report.tests ?? [];
  if (tests.length) {
    lines.push("| Prueba | Resultado | Notas |", "| --- | --- | --- |");
    for (const t of tests.slice(0, 30)) {
      const note =
        t.status === "skipped" && t.claimed
          ? `reclamado: ${t.claimed} (no verificado en servidor)`
          : "";
      lines.push(`| ${redactSensitiveText(t.name)} | ${t.status} | ${note} |`);
    }
  } else {
    lines.push("_Sin pruebas reportadas_");
  }

  lines.push("", "### Despliegue");
  if (report.deployUrl) {
    lines.push(`- URL: ${redactSensitiveText(report.deployUrl)}`);
  } else {
    lines.push("_Sin URL de despliegue_");
  }
  if (report.prUrl) {
    lines.push(`- PR: ${redactSensitiveText(report.prUrl)}`);
  }

  const pending = report.pendingItems ?? [];
  lines.push("", "### Pendientes");
  if (pending.length) {
    for (const p of pending.slice(0, 20)) {
      lines.push(`- ${redactSensitiveText(p)}`);
    }
  } else if (report.nextAction) {
    lines.push(`- ${redactSensitiveText(report.nextAction)}`);
  } else {
    lines.push("_Ninguno indicado_");
  }

  if (report.errors?.length) {
    lines.push("", "### Errores");
    for (const e of report.errors.slice(0, 10)) {
      lines.push(`- ${redactSensitiveText(e)}`);
    }
  }

  lines.push(
    "",
    "---",
    "_Publicado automáticamente por TiendaPro Bridge (tienda-web). ChatGPT puede leer este comentario desde GitHub._"
  );

  return lines.join("\n");
}

export type GitHubReportDeliveryResult =
  | { ok: true; commentUrl: string; commentId: number }
  | { ok: false; error: string; skipped?: boolean };

export async function deliverBridgeReportToPullRequest(input: {
  taskId: string;
  taskTitle: string;
  taskStatus: BridgeTaskStatus;
  report: BridgeTaskResultReport;
}): Promise<GitHubReportDeliveryResult> {
  const parsed = parseAuthorizedPullRequestUrl(input.report.prUrl);
  if (!parsed) {
    return { ok: false, error: "pr_url ausente o no autorizado (solo tienda-web)", skipped: true };
  }

  const token = getGitHubBridgeToken();
  if (!token) {
    return { ok: false, error: "GITHUB_BRIDGE_TOKEN no configurado", skipped: true };
  }

  const body = formatBridgeReportCommentMarkdown(input);
  const { owner, repo, pullNumber } = parsed;

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues/${pullNumber}/comments`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "tiendapro-bridge-report/1.0",
      },
      body: JSON.stringify({ body }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: `GitHub API ${res.status}: ${text.slice(0, 180)}` };
  }

  const json = (await res.json()) as { html_url: string; id: number };
  return { ok: true, commentUrl: json.html_url, commentId: json.id };
}
