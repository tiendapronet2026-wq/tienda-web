import Link from "next/link";
import {
  CasaLeonProjectHeader,
  type CasaLeonOperational,
} from "@/components/mm-control/CasaLeonProjectHeader";
import { mmControlConfigured, mmControlFetch } from "@/lib/mm-control/server";

const tabs = [
  { href: "/control/mm/proyectos/casa-leon", label: "Resumen" },
  { href: "/control/mm/proyectos/casa-leon/inteligencia", label: "Inteligencia" },
  { href: "/control/mm/proyectos/casa-leon/diagnostico", label: "Diagnóstico" },
];

type CasaLeonDiagnosticsPayload = {
  project_status: string;
  connection_status: string;
  operational?: CasaLeonOperational;
  activation_progress?: { met: boolean; passed: number; total: number };
};

export default async function CasaLeonProjectPage() {
  const diag = mmControlConfigured()
    ? await mmControlFetch<CasaLeonDiagnosticsPayload>("/projects/casa_leon/diagnostics")
    : null;

  const status = diag?.ok ? diag.data.project_status : "—";
  const conn = diag?.ok ? diag.data.connection_status : "—";
  const operational = diag?.ok ? diag.data.operational ?? null : null;
  const activationProgress = diag?.ok ? diag.data.activation_progress : null;
  const isActive = status === "ACTIVE";

  return (
    <div className="space-y-6">
      <div>
        <Link href="/control/mm/proyectos" className="text-sm text-amber-400 hover:underline">← Proyectos</Link>
        <h2 className="mt-2 text-2xl font-semibold">Casa León</h2>
        <CasaLeonProjectHeader
          projectStatus={status}
          connectionStatus={conn}
          operational={operational}
        />
      </div>

      <nav className="flex gap-2 border-b border-[#2a2f36] pb-2">
        {tabs.map((t) => (
          <Link key={t.href} href={t.href} className="rounded px-3 py-1.5 text-sm text-[#a8b0bc] hover:bg-[#1a1e24]">
            {t.label}
          </Link>
        ))}
      </nav>

      <section className="rounded-lg border border-[#2a2f36] bg-[#14181d] p-5 text-sm text-[#a8b0bc]">
        {!isActive ? (
          <p className="text-[#f3f0e8]">
            Casa León aún no está listo para operar. Revisá el diagnóstico técnico
            {activationProgress && !activationProgress.met
              ? ` (${activationProgress.passed} de ${activationProgress.total} requisitos obligatorios).`
              : "."}
          </p>
        ) : (
          <p className="text-[#f3f0e8]">
            Podés consultar ventas, operación e inteligencia agregada en solo lectura. La IA generativa con razonamiento
            en vivo sigue desactivada por política de costos.
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-4">
          <Link href="/control/mm/proyectos/casa-leon/inteligencia" className="font-medium text-amber-400">
            Ver inteligencia →
          </Link>
          <Link href="/control/mm/proyectos/casa-leon/diagnostico" className="font-medium text-amber-400">
            Diagnóstico técnico →
          </Link>
        </div>
      </section>
    </div>
  );
}
