import { PageTitle } from "@/components/platform/PageTitle";
import { PlatformPanelDataNotice } from "@/components/platform/PlatformPanelDataNotice";
import { mockTasks } from "@/lib/mock/panel-data";
import { isExplicitDevMockMode } from "@/lib/platform/tenant-loader";

export default function ControlTareasPage() {
  const mockMode = isExplicitDevMockMode();

  return (
    <>
      <PageTitle title="Tareas" description="Coordinación interna TiendaPro." />
      {mockMode ? (
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {mockTasks.map((t) => (
            <li key={t.id} className="px-4 py-4 text-sm">
              <p className="font-medium text-foreground">{t.title}</p>
              <p className="text-text-secondary">
                {t.assignee} · {t.status}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <PlatformPanelDataNotice section="Tareas" />
      )}
    </>
  );
}
