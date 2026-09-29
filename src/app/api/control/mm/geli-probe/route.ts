import { NextResponse } from "next/server";
import { requireMmControlApiActor } from "@/lib/mm-control/api-auth";
import { mmControlFetch } from "@/lib/mm-control/server";

export async function POST(request: Request) {
  const actor = await requireMmControlApiActor();
  if (!actor.ok) {
    return NextResponse.json({ ok: false, error: actor.error }, { status: actor.status });
  }

  const body = await request.json().catch(() => ({}));
  const result = await mmControlFetch<Record<string, unknown>>(
    "/projects/casa_leon/actions/geli-channel-probe",
    {
      method: "POST",
      body: JSON.stringify(body),
      actorRef: actor.actorRef,
    }
  );

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}
