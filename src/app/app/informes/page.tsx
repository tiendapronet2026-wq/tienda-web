import Link from "next/link";
import { PageTitle } from "@/components/platform/PageTitle";
import { PlatformPanelDataNotice } from "@/components/platform/PlatformPanelDataNotice";
import { mockReports } from "@/lib/mock/panel-data";
import { isExplicitDevMockMode } from "@/lib/platform/tenant-loader";

export default function AppInformesPage() {
  const mockMode = isExplicitDevMockMode();

  return (
    <>
      <PageTitle title="Informes" description="Módulo reportes. Mocks solo en desarrollo explícito." />
      {mockMode ? (
        <ul className="space-y-3">
          {mockReports.map((r) => (
            <li key={r.id} className="rounded-xl border border-border bg-surface p-4 text-sm">
              {r.title}
            </li>
          ))}
        </ul>
      ) : (
        <PlatformPanelDataNotice section="Informes" />
      )}
      <Link href="/demos/dashboard" className="mt-4 inline-flex text-sm font-semibold text-brand">
        Showroom dashboard →
      </Link>
    </>
  );
}
