import { PageTitle } from "@/components/platform/PageTitle";
import { mockTasks } from "@/lib/mock/panel-data";

export default function ControlTareasPage() {
  return (
    <>
      <PageTitle title="Tareas" description="Coordinación interna TiendaPro (demo)." />
      <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
        {mockTasks.map((t) => (
          <li key={t.id} className="px-4 py-4 text-sm">
            <p className="font-medium text-foreground">{t.title}</p>
            <p className="text-text-secondary">{t.assignee} · {t.status}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
