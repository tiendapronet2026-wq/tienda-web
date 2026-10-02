import { NextResponse } from "next/server";

/**
 * Esqueleto Gate 3F — firma, replay e idempotencia en gates posteriores.
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider } = await context.params;
  return NextResponse.json(
    {
      ok: false,
      provider,
      message: "Webhook no implementado en Gate 3F.",
    },
    { status: 501 },
  );
}
