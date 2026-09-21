import Link from "next/link";
import { notFound } from "next/navigation";
import { PageTitle } from "@/components/platform/PageTitle";
import { OperationalTaskActions } from "@/components/platform/OperationalBridgePanel";
import { createClient } from "@/lib/supabase/server";
import { loadSessionPlatformContext } from "@/lib/platform/session-platform";
import { isControlOwnerRole } from "@/lib/platform/control-owner-guard";
import { loadBridgeTaskById } from "@/lib/bridge/repository";
import { isTiendaProSupabaseConfigured } from "@/lib/platform/tenant-loader";
import { PlatformPanelDataNotice } from "@/components/platform/PlatformPanelDataNotice";

export default async function TareaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isTiendaProSupabaseConfigured()) {
    return (
      <>
        <PageTitle title="Tarea" description="Puente operativo" />
        <PlatformPanelDataNotice section="Tareas" />
      </>
    );
  }

  const { task, events } = await loadBridgeTaskById(id);
  if (!task) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const ctx = user ? await loadSessionPlatformContext(supabase, user.id) : null;
  const isOwner = ctx ? isControlOwnerRole(ctx) : false;

  const report = task.result_report ?? {};

  return (
    <>
      <Link href="/control/tareas" className="text-sm font-semibold text-brand hover:underline">
        ← Tareas
      </Link>
      <PageTitle title={task.title} description={`Estado: ${task.status} · ${task.risk_class}`} />

      <section className="mt-6 rounded-xl border border-border bg-surface p-5 text-sm">
        <h2 className="font-semibold text-foreground">Instrucción</h2>
        <p className="mt-2 whitespace-pre-wrap text-text-secondary">{task.instruction}</p>
        <dl className="mt-4 grid gap-2 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase text-muted">Proyecto</dt>
            <dd>{task.bridge_projects?.display_name ?? task.project_id}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-muted">Recursos</dt>
            <dd className="font-mono text-xs">{JSON.stringify(task.resources)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-muted">Ejecutor / ref</dt>
            <dd>
              {task.executor}
              {task.external_ref ? ` #${task.external_ref}` : ""}
            </dd>
          </div>
        </dl>
      </section>

      <OperationalTaskActions taskId={task.id} status={task.status} isOwner={isOwner} />

      {Object.keys(report).length ? (
        <section className="mt-8 rounded-xl border border-border bg-surface-muted p-5">
          <h2 className="text-lg font-semibold">Informe final</h2>
          {report.githubReportCommentUrl ? (
            <p className="mt-2 text-sm">
              <a
                href={String(report.githubReportCommentUrl)}
                className="font-medium text-brand hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Ver informe en GitHub (comentario del PR)
              </a>
            </p>
          ) : null}
          <pre className="mt-3 overflow-auto text-xs">{JSON.stringify(report, null, 2)}</pre>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Historial</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {events.map((e) => (
            <li key={e.id} className="rounded-lg border border-border px-3 py-2">
              <span className="font-medium">{e.event_type}</span> · {e.summary}
              <span className="block text-xs text-muted">{new Date(e.created_at).toLocaleString("es-AR")}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
