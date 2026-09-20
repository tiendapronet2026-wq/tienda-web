import type { BridgeTaskResultReport } from "@/lib/bridge/constants";

export type GitHubIssueDispatchResult =
  | { ok: true; issueNumber: number; issueUrl: string; simulated: boolean }
  | { ok: false; error: string; simulated: boolean };

/**
 * Transporte inicial: issue en GitHub como cola visible para Cursor (sin API paga de Cursor).
 */
export async function dispatchBridgeTaskViaGitHubIssue(input: {
  taskId: string;
  title: string;
  instruction: string;
  githubRepo: string;
  riskClass: string;
}): Promise<GitHubIssueDispatchResult> {
  const token =
    process.env.GITHUB_BRIDGE_TOKEN?.trim() || process.env.INSTALLER_GITHUB_TOKEN?.trim();
  if (!token) {
    return {
      ok: true,
      issueNumber: 0,
      issueUrl: `https://github.com/${input.githubRepo}/issues (simulado — sin GITHUB_BRIDGE_TOKEN)`,
      simulated: true,
    };
  }

  const [owner, repo] = input.githubRepo.split("/");
  if (!owner || !repo) {
    return { ok: false, error: "github_repo inválido", simulated: false };
  }

  const body = [
    "## Puente operativo TiendaPro",
    "",
    `- **Task ID:** \`${input.taskId}\``,
    `- **Riesgo:** ${input.riskClass}`,
    "",
    "### Instrucción",
    input.instruction,
    "",
    "---",
    "Ejecutor esperado: agente Cursor / humano con acceso al repo autorizado.",
    "Registrar resultado vía API `/api/bridge/v1/tasks/{id}/result` o panel Control.",
  ].join("\n");

  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "tiendapro-bridge/1.0",
    },
    body: JSON.stringify({
      title: `[Bridge] ${input.title}`,
      body,
      labels: ["bridge-task", "tiendapro"],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: `GitHub API ${res.status}: ${text.slice(0, 200)}`, simulated: false };
  }

  const json = (await res.json()) as { number: number; html_url: string };
  return {
    ok: true,
    issueNumber: json.number,
    issueUrl: json.html_url,
    simulated: false,
  };
}

export function buildSimulatedCursorResult(): BridgeTaskResultReport {
  return {
    summary: "Resultado simulado (Cursor API no invocada — modo seguro v1).",
    filesChanged: [],
    tests: [{ name: "circuit-validation", status: "pass" }],
    prUrl: null,
    deployUrl: null,
    errors: [],
    nextAction: "Conectar CURSOR_API_KEY y webhook oficial cuando el propietario autorice consumo.",
    simulated: true,
  };
}
