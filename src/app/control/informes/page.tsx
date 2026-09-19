import { PageTitle } from "@/components/platform/PageTitle";
import { mockReports } from "@/lib/mock/panel-data";

export default function ControlInformesPage() {
  return (
    <>
      <PageTitle title="Informes" description="Informes operativos del propietario (demo)." />
      <ul className="space-y-4">
        {mockReports.map((r) => (
          <li key={r.id} className="rounded-xl border border-border bg-surface p-5">
            <p className="font-semibold text-foreground">{r.title}</p>
            <p className="mt-1 text-sm text-text-secondary">{r.summary}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
