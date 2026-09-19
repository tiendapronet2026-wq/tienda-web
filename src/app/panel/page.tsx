import Link from "next/link";
import { PageTitle } from "@/components/platform/PageTitle";
import { StatGrid } from "@/components/platform/StatGrid";
import { panelStats, mockTasks, mockProjects } from "@/lib/mock/panel-data";

export default function PanelHomePage() {
  return (
    <>
      <PageTitle
        title="Resumen"
        description="Vista general del centro de operaciones. Métricas y listados con datos ficticios."
      />
      <StatGrid
        stats={[
          { label: "Clientes activos (demo)", value: panelStats.activeClients },
          { label: "Proyectos abiertos", value: panelStats.openProjects },
          { label: "Tareas esta semana", value: panelStats.tasksDueWeek },
          { label: "Ejecuciones agente hoy", value: panelStats.agentRunsToday, hint: "Sin integraciones externas" },
        ]}
      />
      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="text-lg font-semibold text-foreground">Proyectos recientes</h2>
          <ul className="mt-3 space-y-2">
            {mockProjects.map((p) => (
              <li key={p.id} className="rounded-lg border border-border bg-surface px-4 py-3 text-sm">
                <p className="font-medium text-foreground">{p.name}</p>
                <p className="text-text-secondary">{p.client} · {p.progress}%</p>
              </li>
            ))}
          </ul>
          <Link href="/panel/proyectos" className="mt-3 inline-block text-sm font-semibold text-brand">
            Ver proyectos →
          </Link>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">Tareas</h2>
          <ul className="mt-3 space-y-2">
            {mockTasks.slice(0, 3).map((t) => (
              <li key={t.id} className="rounded-lg border border-border bg-surface px-4 py-3 text-sm">
                <p className="font-medium text-foreground">{t.title}</p>
                <p className="text-text-secondary">{t.status} · {t.due}</p>
              </li>
            ))}
          </ul>
          <Link href="/panel/tareas" className="mt-3 inline-block text-sm font-semibold text-brand">
            Ver tareas →
          </Link>
        </section>
      </div>
    </>
  );
}
