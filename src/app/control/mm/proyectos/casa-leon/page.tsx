import Link from "next/link";
import { StatusPill } from "@/components/mm-control/StatusPill";
import { mmControlConfigured, mmControlFetch } from "@/lib/mm-control/server";

const tabs = [
  { href: "/control/mm/proyectos/casa-leon", label: "Resumen" },
  { href: "/control/mm/proyectos/casa-leon/diagnostico", label: "Diagnóstico" },
];

export default async function CasaLeonProjectPage() {
  const diag = mmControlConfigured()
    ? await mmControlFetch<{
        project_status: string;
        connection_status: string;
        progress: { passed: number; total: number };
      }>("/projects/casa_leon/diagnostics")
    : null;

  const status = diag?.ok ? diag.data.project_status : "—";
  const conn = diag?.ok ? diag.data.connection_status : "—";
  const progress = diag?.ok ? diag.data.progress : null;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/control/mm/proyectos" className="text-sm text-amber-400 hover:underline">← Proyectos</Link>
        <h2 className="mt-2 text-2xl font-semibold">Casa León</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          <StatusPill label={status} tone={status === "ACTIVE" ? "ok" : "warn"} />
          <StatusPill label="READ ONLY" tone="read" />
          <StatusPill label="Lab" tone="muted" />
          <StatusPill label={`Gateway ${conn}`} tone={conn === "ACTIVE" ? "ok" : "muted"} />
        </div>
      </div>

      <nav className="flex gap-2 border-b border-[#2a2f36] pb-2">
        {tabs.map((t) => (
          <Link key={t.href} href={t.href} className="rounded px-3 py-1.5 text-sm text-[#a8b0bc] hover:bg-[#1a1e24]">
            {t.label}
          </Link>
        ))}
      </nav>

      <section className="rounded-lg border border-[#2a2f36] bg-[#14181d] p-5 text-sm text-[#a8b0bc]">
        {status !== "ACTIVE" ? (
          <p className="text-[#f3f0e8]">
            Casa León todavía no está ACTIVE. Gateway conectado en producción. Faltan verificaciones obligatorias en
            Diagnóstico.
          </p>
        ) : (
          <p className="text-[#f3f0e8]">Proyecto ACTIVE en modo READ ONLY. Live reasoning sigue bloqueado por costo.</p>
        )}
        {progress ? (
          <p className="mt-2">Activación: {progress.passed}/{progress.total} condiciones cumplidas.</p>
        ) : null}
        <Link
          href="/control/mm/proyectos/casa-leon/diagnostico"
          className="mt-4 inline-block font-medium text-amber-400"
        >
          Ir a diagnóstico →
        </Link>
      </section>
    </div>
  );
}
