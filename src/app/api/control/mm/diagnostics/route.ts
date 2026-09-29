import { NextResponse } from "next/server";
import { requireMmControlApiActor } from "@/lib/mm-control/api-auth";
import { mmControlFetch } from "@/lib/mm-control/server";

export async function GET(request: Request) {
  const actor = await requireMmControlApiActor();
  if (!actor.ok) {
    return NextResponse.json({ ok: false, error: actor.error }, { status: actor.status });
  }

  const url = new URL(request.url);
  const project = url.searchParams.get("project");
  if (project !== "casa_leon") {
    return NextResponse.json({ ok: false, error: "project_not_supported" }, { status: 400 });
  }

  const result = await mmControlFetch<Record<string, unknown>>("/projects/casa_leon/diagnostics", {
    actorRef: actor.actorRef,
  });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}
