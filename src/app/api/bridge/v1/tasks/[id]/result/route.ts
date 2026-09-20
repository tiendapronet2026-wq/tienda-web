import { NextResponse } from "next/server";
import { getBridgeApiAuthHeader, isBridgeApiConfigured, verifyBridgeApiSecret } from "@/lib/bridge/api-auth";
import { registerBridgeTaskResultExternal } from "@/lib/bridge/register-result-service";
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

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const result = await registerBridgeTaskResultExternal(id, body);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status ?? 400 });
  }

  return NextResponse.json({ ok: true, task_id: id, status: result.status });
}
