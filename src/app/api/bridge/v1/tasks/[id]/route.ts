import { NextResponse } from "next/server";
import { getBridgeApiAuthHeader, isBridgeApiConfigured, verifyBridgeApiSecret } from "@/lib/bridge/api-auth";
import { loadBridgeTaskByIdForBridgeApi } from "@/lib/bridge/repository";
import { isTiendaProSupabaseConfigured } from "@/lib/platform/tenant-loader";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
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

  const { task, events } = await loadBridgeTaskByIdForBridgeApi(id);
  if (!task) {
    return NextResponse.json({ ok: false, error: "No encontrada" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    task: {
      id: task.id,
      title: task.title,
      instruction: task.instruction,
      status: task.status,
      risk_class: task.risk_class,
      approval_required: task.approval_required,
      resources: task.resources,
      executor: task.executor,
      external_ref: task.external_ref,
      result_report: task.result_report,
      created_at: task.created_at,
      updated_at: task.updated_at,
      project: task.bridge_projects,
    },
    history: events,
  });
}
