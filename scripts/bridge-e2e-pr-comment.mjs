/**
 * Prueba real: registra resultado vía API Bridge y publica comentario en PR.
 * Requiere:
 *   BRIDGE_API_SECRET
 *   GITHUB_BRIDGE_TOKEN (o INSTALLER_GITHUB_TOKEN) con permiso de comentar PRs en tienda-web
 *   BRIDGE_DEMO_BASE_URL (default https://www.tiendapro.net)
 *   BRIDGE_E2E_TASK_ID (tarea en status dispatched o running)
 *   BRIDGE_E2E_PR_URL (default PR #13)
 */
const base = (process.env.BRIDGE_DEMO_BASE_URL ?? "https://www.tiendapro.net").replace(/\/$/, "");
const secret = process.env.BRIDGE_API_SECRET?.trim();
const taskId = process.env.BRIDGE_E2E_TASK_ID?.trim();
const prUrl =
  process.env.BRIDGE_E2E_PR_URL?.trim() ??
  "https://github.com/tiendapronet2026-wq/tienda-web/pull/13";

if (!secret || !taskId) {
  console.error("Definí BRIDGE_API_SECRET y BRIDGE_E2E_TASK_ID");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${secret}`,
  "Content-Type": "application/json",
};

const body = {
  summary: "Informe E2E entrega automática PR — prueba TiendaPro Bridge",
  files_changed: ["src/lib/bridge/github-delivery.ts", "src/lib/bridge/register-result-service.ts"],
  tests: [{ name: "github-delivery.test.ts", status: "pass" }],
  deploy_url: "https://www.tiendapro.net",
  pr_url: prUrl,
  pending: ["Sincronizar Custom GPT con BRIDGE_API_SECRET si hubo rotación"],
  next_action: "ChatGPT puede leer el comentario del PR vía GitHub",
};

const res = await fetch(`${base}/api/bridge/v1/tasks/${taskId}/result`, {
  method: "POST",
  headers,
  body: JSON.stringify(body),
});

const json = await res.json();
console.log("HTTP", res.status, JSON.stringify(json, null, 2));

if (!json.ok || !json.github_report_comment_url) {
  console.error("No se publicó comentario en GitHub (revisá GITHUB_BRIDGE_TOKEN en Vercel y pr_url).");
  process.exit(1);
}

console.log("GITHUB_COMMENT_URL", json.github_report_comment_url);
process.exit(0);
