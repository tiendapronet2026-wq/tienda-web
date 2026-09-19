import { PageTitle } from "@/components/platform/PageTitle";
import { PlatformPanelDataNotice } from "@/components/platform/PlatformPanelDataNotice";
import { mockReports } from "@/lib/mock/panel-data";
import { isExplicitDevMockMode } from "@/lib/platform/tenant-loader";

export default function ControlInformesPage() {
  const mockMode = isExplicitDevMockMode();

  return (
    <>
      <PageTitle title="Informes" description="Informes operativos del propietario." />
      {mockMode ? (
        <ul className="space-y-4">
          {mockReports.map((r) => (
            <li key={r.id} className="rounded-xl border border-border bg-surface p-5">
              <p className="font-semibold text-foreground">{r.title}</p>
              <p className="mt-1 text-sm text-text-secondary">{r.summary}</p>
            </li>
          ))}
        </ul>
      ) : (
        <PlatformPanelDataNotice section="Informes Control" />
      )}
    </>
  );
}
