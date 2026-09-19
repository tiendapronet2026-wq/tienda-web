import { PageTitle } from "@/components/platform/PageTitle";
import { mockProjects } from "@/lib/mock/panel-data";

export default function PanelProyectosPage() {
  return (
    <>
      <PageTitle title="Proyectos" description="Pipeline ficticio por cliente y fase." />
      <ul className="space-y-3">
        {mockProjects.map((p) => (
          <li key={p.id} className="rounded-xl border border-border bg-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-foreground">{p.name}</p>
                <p className="text-sm text-text-secondary">{p.client}</p>
              </div>
              <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand capitalize">
                {p.phase}
              </span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-muted">
              <div className="h-full rounded-full bg-brand" style={{ width: `${p.progress}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted">{p.progress}% completado (demo)</p>
          </li>
        ))}
      </ul>
    </>
  );
}
