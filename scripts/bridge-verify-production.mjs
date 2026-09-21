/**
 * Verificación real del puente en producción (sin simular Cursor).
 * Uso: BRIDGE_API_SECRET=... BRIDGE_DEMO_BASE_URL=https://www.tiendapro.net node scripts/bridge-verify-production.mjs
 */
const base = (process.env.BRIDGE_DEMO_BASE_URL ?? "https://www.tiendapro.net").replace(/\/$/, "");
const secret = process.env.BRIDGE_API_SECRET?.trim();

const results = [];

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(ok ? "PASS" : "FAIL", name, detail ?? "");
}

if (!secret) {
  console.error("BRIDGE_API_SECRET requerido en entorno (no imprimir en logs públicos).");
  process.exit(1);
}

const anon = await fetch(`${base}/api/bridge/v1/tasks`);
const anonBody = await anon.json();
record(
  "anon_get_expect_401",
  anon.status === 401,
  `http=${anon.status} error=${anonBody.error ?? ""}`
);

const headers = { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" };

const unauthWrong = await fetch(`${base}/api/bridge/v1/tasks`, {
  headers: { Authorization: "Bearer definitely-wrong-token-value-here" },
});
record("wrong_bearer_expect_401", unauthWrong.status === 401, `http=${unauthWrong.status}`);

const list = await fetch(`${base}/api/bridge/v1/tasks?limit=5`, { headers });
const listJson = await list.json();
record("auth_list_tasks", list.ok && listJson.ok === true, `http=${list.status}`);

const create = await fetch(`${base}/api/bridge/v1/tasks`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    title: "Verificación circuito ChatGPT bridge",
    instruction: "Tarea de prueba automatizada — descartar o cancelar en Control.",
    project_slug: "tiendapro",
  }),
});
const created = await create.json();
record(
  "auth_create_task",
  create.ok && created.ok && created.task_id && created.status === "pending_approval",
  `http=${create.status} status=${created.status ?? created.error}`
);

let taskId = created.task_id;
if (taskId) {
  const poll = await fetch(`${base}/api/bridge/v1/tasks/${taskId}`, { headers });
  const detail = await poll.json();
  record(
    "auth_poll_task",
    poll.ok && detail.ok && detail.task?.id === taskId,
    `http=${poll.status} task_status=${detail.task?.status ?? ""}`
  );

  const earlyResult = await fetch(`${base}/api/bridge/v1/tasks/${taskId}/result`, {
    method: "POST",
    headers,
    body: JSON.stringify({ summary: "should fail before dispatch" }),
  });
  record(
    "external_result_blocked_before_dispatch",
    earlyResult.status === 409,
    `http=${earlyResult.status}`
  );
}

const openapi = await fetch(`${base}/bridge/openapi.yaml`);
record("openapi_public", openapi.ok && (await openapi.text()).includes("Bridge API"), `http=${openapi.status}`);

const failed = results.filter((r) => !r.ok);
if (failed.length) {
  console.error("\nVerification failed:", failed);
  process.exit(1);
}
console.log("\nAll bridge production checks passed.");
process.exit(0);
