import { PageTitle } from "@/components/platform/PageTitle";
import { mockTasks } from "@/lib/mock/panel-data";

export default function PanelTareasPage() {
  return (
    <>
      <PageTitle title="Tareas" description="Seguimiento interno demo para equipos y agentes." />
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
        {mockTasks.map((t) => (
          <li key={t.id} className="grid gap-2 px-4 py-4 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center sm:gap-4">
            <div>
              <p className="font-medium text-foreground">{t.title}</p>
              <p className="text-sm text-text-secondary">{t.project}</p>
            </div>
            <span className="text-sm text-text-secondary">{t.assignee}</span>
            <span className="text-sm text-text-secondary">{t.due}</span>
            <span className="text-xs font-semibold uppercase tracking-wide text-brand">{t.status}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
