import { NextResponse } from "next/server";
import { confirmLinkSession } from "@/lib/integrations/integration-service";
import { stripSecretsFromObject } from "@/lib/integrations/credentials";

const hits = new Map<string, { count: number; reset: number }>();

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const row = hits.get(ip);
  if (!row || now > row.reset) {
    hits.set(ip, { count: 1, reset: now + 60_000 });
    return true;
  }
  if (row.count >= 30) return false;
  row.count += 1;
  return true;
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(ip)) {
    return NextResponse.json({ error: "Demasiados intentos." }, { status: 429 });
  }

  let body: { token?: string; state?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const token = String(body.token ?? "").trim();
  if (!token || token.length < 16) {
    return NextResponse.json({ error: "Token inválido." }, { status: 400 });
  }

  try {
    const result = await confirmLinkSession(token, body.state ?? null);
    return NextResponse.json(
      stripSecretsFromObject({
        ok: true,
        connectionId: result.connectionId,
        provider: result.provider,
      }),
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al vincular.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
