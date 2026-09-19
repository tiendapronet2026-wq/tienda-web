import { PageTitle } from "@/components/platform/PageTitle";
import { controlRequests } from "@/lib/mock/control-data";

export default function ControlSolicitudesPage() {
  return (
    <>
      <PageTitle title="Solicitudes" description="Altas, cambios de plan y módulos (demo)." />
      <ul className="space-y-2">
        {controlRequests.map((s) => (
          <li key={s.id} className="rounded-lg border border-border bg-surface px-4 py-3 text-sm">
            <p className="font-medium text-foreground">{s.subject}</p>
            <p className="text-text-secondary">{s.tenant} · {s.status}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
