import { PageTitle } from "@/components/platform/PageTitle";
import { mockProjects } from "@/lib/mock/panel-data";

export default function ControlProyectosPage() {
  return (
    <>
      <PageTitle title="Proyectos" description="Proyectos operativos TiendaPro (demo Control)." />
      <ul className="space-y-3">
        {mockProjects.map((p) => (
          <li key={p.id} className="rounded-xl border border-border bg-surface p-5">
            <p className="font-semibold text-foreground">{p.name}</p>
            <p className="text-sm text-text-secondary">{p.client}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
