import { NextResponse } from "next/server";
import {
  getBridgeApiAuthHeader,
  getBridgeApiConfigStatus,
  isBridgeApiConfigured,
  verifyBridgeApiSecret,
  BRIDGE_API_SECRET_MIN_LENGTH,
} from "@/lib/bridge/api-auth";
import { BRIDGE_PILOT_PROJECT_SLUG } from "@/lib/bridge/constants";
import { createBridgeTaskRecord } from "@/lib/bridge/create-task";
import { normalizeExternalRiskClass } from "@/lib/bridge/register-result";
import { loadBridgeTasksForBridgeApi } from "@/lib/bridge/repository";
import { isTiendaProSupabaseConfigured } from "@/lib/platform/tenant-loader";

function unauthorized() {
  return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
}

function bridgeDisabled() {
  const configStatus = getBridgeApiConfigStatus();
  return NextResponse.json(
    {
      ok: false,
      error: "Bridge API no configurada (BRIDGE_API_SECRET)",
      config_status: configStatus,
      min_secret_length: configStatus === "too_short" ? BRIDGE_API_SECRET_MIN_LENGTH : undefined,
    },
    { status: 503 }
  );
}

export async function GET(request: Request) {
  if (!isTiendaProSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "Plataforma no configurada" }, { status: 503 });
  }
  if (!isBridgeApiConfigured()) return bridgeDisabled();
  if (!verifyBridgeApiSecret(getBridgeApiAuthHeader(request))) return unauthorized();

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 20), 100);
  const tasks = await loadBridgeTasksForBridgeApi(limit);

  return NextResponse.json({
    ok: true,
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      risk_class: t.risk_class,
      project: t.bridge_projects,
      created_at: t.created_at,
      result_report: t.result_report,
    })),
    integration: {
      transport: "https REST (Bearer BRIDGE_API_SECRET)",
      cursor_executor: "manual/github_issue v1 — Cursor API no invocada",
      chatgpt: "Custom GPT Action puede POST/GET estos endpoints con el mismo secret",
    },
  });
}

export async function POST(request: Request) {
  if (!isTiendaProSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "Plataforma no configurada" }, { status: 503 });
  }
  if (!isBridgeApiConfigured()) return bridgeDisabled();
  if (!verifyBridgeApiSecret(getBridgeApiAuthHeader(request))) return unauthorized();

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const title = String(body.title ?? "Tarea bridge").trim();
  const instruction = String(body.instruction ?? "").trim();
  const riskClass = normalizeExternalRiskClass(body.risk_class, "bridge_api");
  const projectSlug = String(body.project_slug ?? BRIDGE_PILOT_PROJECT_SLUG);

  if (!instruction) {
    return NextResponse.json({ ok: false, error: "instruction requerida" }, { status: 400 });
  }

  const resourcesOverride = body.resources as Record<string, string> | undefined;
  const created = await createBridgeTaskRecord({
    projectSlug,
    title,
    instruction,
    riskClass,
    source: "bridge_api",
    actor: "bridge_api",
    resourcesOverride: resourcesOverride
      ? {
          github_repo: resourcesOverride.github_repo,
          supabase_project_ref: resourcesOverride.supabase_project_ref,
          vercel_project: resourcesOverride.vercel_project,
        }
      : undefined,
  });

  if (!created.ok) {
    return NextResponse.json({ ok: false, error: created.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    task_id: created.task.id,
    status: created.task.status,
    approval_required: created.task.approval_required,
    project: created.project,
    poll_url: `/api/bridge/v1/tasks/${created.task.id}`,
  });
}
