import Link from "next/link";
import { PageTitle } from "@/components/platform/PageTitle";
import { mockReports } from "@/lib/mock/panel-data";

export default function AppInformesPage() {
  return (
    <>
      <PageTitle title="Informes" description="Módulo reportes (demo). Datos ficticios." />
      <ul className="space-y-3">
        {mockReports.map((r) => (
          <li key={r.id} className="rounded-xl border border-border bg-surface p-4 text-sm">
            {r.title}
          </li>
        ))}
      </ul>
      <Link href="/demos/dashboard" className="mt-4 inline-flex text-sm font-semibold text-brand">
        Showroom dashboard →
      </Link>
    </>
  );
}
