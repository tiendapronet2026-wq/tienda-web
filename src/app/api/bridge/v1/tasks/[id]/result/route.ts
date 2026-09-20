import { NextResponse } from "next/server";
import { registerOperationalTaskResult } from "@/app/actions/operational-bridge";
import { getBridgeApiAuthHeader, isBridgeApiConfigured, verifyBridgeApiSecret } from "@/lib/bridge/api-auth";
import type { BridgeTaskResultReport } from "@/lib/bridge/constants";
import { loadBridgeTaskById } from "@/lib/bridge/repository";
import { isTiendaProSupabaseConfigured } from "@/lib/platform/tenant-loader";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  if (!isTiendaProSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "Plataforma no configurada" }, { status: 503 });
  }
  if (!isBridgeApiConfigured()) {
    return NextResponse.json({ ok: false, error: "Bridge API no configurada" }, { status: 503 });
  }
  if (!verifyBridgeApiSecret(getBridgeApiAuthHeader(request))) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const { task } = await loadBridgeTaskById(id);
  if (!task) {
    return NextResponse.json({ ok: false, error: "No encontrada" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const report: BridgeTaskResultReport = {
    summary: String(body.summary ?? "Resultado vía bridge API"),
    filesChanged: Array.isArray(body.files_changed)
      ? body.files_changed.map(String)
      : Array.isArray(body.filesChanged)
        ? body.filesChanged.map(String)
        : [],
    tests: Array.isArray(body.tests) ? (body.tests as BridgeTaskResultReport["tests"]) : [],
    prUrl: body.pr_url ? String(body.pr_url) : body.prUrl ? String(body.prUrl) : null,
    deployUrl: body.deploy_url ? String(body.deploy_url) : body.deployUrl ? String(body.deployUrl) : null,
    errors: Array.isArray(body.errors) ? body.errors.map(String) : [],
    nextAction: body.next_action ? String(body.next_action) : body.nextAction ? String(body.nextAction) : null,
    simulated: Boolean(body.simulated),
  };

  await registerOperationalTaskResult(id, report, "bridge_api");

  return NextResponse.json({ ok: true, task_id: id, status: report.errors?.length ? "failed" : "completed" });
}
