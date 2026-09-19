import { PageTitle } from "@/components/platform/PageTitle";
import { mockReports } from "@/lib/mock/panel-data";

export default function PanelInformesPage() {
  return (
    <>
      <PageTitle title="Informes" description="Registro demo al estilo entregas de agentes Cloud." />
      <ul className="space-y-4">
        {mockReports.map((r) => (
          <li key={r.id} className="rounded-xl border border-border bg-surface p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-semibold text-foreground">{r.title}</h2>
              <time className="text-xs text-muted">{r.createdAt}</time>
            </div>
            <p className="mt-1 text-sm text-text-secondary">Agente: {r.agent}</p>
            <p className="mt-3 text-sm leading-relaxed text-foreground">{r.summary}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
