import { PageTitle } from "@/components/platform/PageTitle";
import { PlatformPanelDataNotice } from "@/components/platform/PlatformPanelDataNotice";
import { mockProjects } from "@/lib/mock/panel-data";
import { isExplicitDevMockMode } from "@/lib/platform/tenant-loader";

export default function ControlProyectosPage() {
  const mockMode = isExplicitDevMockMode();

  return (
    <>
      <PageTitle title="Proyectos" description="Proyectos operativos TiendaPro (Control)." />
      {mockMode ? (
        <ul className="space-y-3">
          {mockProjects.map((p) => (
            <li key={p.id} className="rounded-xl border border-border bg-surface p-5">
              <p className="font-semibold text-foreground">{p.name}</p>
              <p className="text-sm text-text-secondary">{p.client}</p>
            </li>
          ))}
        </ul>
      ) : (
        <PlatformPanelDataNotice section="Proyectos" />
      )}
    </>
  );
}
