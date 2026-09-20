/**
 * Demostración puente operativo (API → tarea → resultado simulado).
 * Requiere: migración bridge aplicada, BRIDGE_API_SECRET, TIENDAPRO_PLATFORM_DB=1 en .env.local
 */
const base = process.env.BRIDGE_DEMO_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
const secret = process.env.BRIDGE_API_SECRET?.trim();

if (!secret) {
  console.error("Definí BRIDGE_API_SECRET para la demo.");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${secret}`,
  "Content-Type": "application/json",
};

const createRes = await fetch(`${base}/api/bridge/v1/tasks`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    project_slug: "tiendapro",
    title: "Demo puente operativo",
    instruction: "Verificar que la bandeja Control lista esta tarea (sin cambios en checkout).",
    risk_class: "minor",
    resources: {
      github_repo: "tiendapronet2026-wq/tienda-web",
      supabase_project_ref: "dnptsudsxrcamtxfiszh",
    },
  }),
});

const created = await createRes.json();
if (!created.ok) {
  console.error("CREATE FAIL", created);
  process.exit(1);
}

const taskId = created.task_id;
console.log("CREATE OK", taskId, created.status);

const poll = await fetch(`${base}/api/bridge/v1/tasks/${taskId}`, { headers });
const detail = await poll.json();
console.log("POLL OK", detail.task?.status);

const resultRes = await fetch(`${base}/api/bridge/v1/tasks/${taskId}/result`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    summary: "Demo completada — circuito API verificado",
    files_changed: ["src/lib/bridge/constants.ts"],
    tests: [{ name: "bridge.test.ts", status: "pass" }],
    simulated: true,
    next_action: "Despachar issue GitHub + agente Cursor con API key autorizada",
  }),
});

const result = await resultRes.json();
console.log(result.ok ? "RESULT OK" : "RESULT FAIL", result);
process.exit(result.ok ? 0 : 1);
