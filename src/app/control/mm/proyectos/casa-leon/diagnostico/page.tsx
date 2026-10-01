import Link from "next/link";
import { CasaLeonDiagnosticsPanel } from "@/components/mm-control/CasaLeonDiagnosticsPanel";
import { mmControlConfigured, mmControlFetch } from "@/lib/mm-control/server";

export default async function CasaLeonDiagnosticoPage() {
  const initial = mmControlConfigured()
    ? await mmControlFetch<{
        ok: boolean;
        project_status: string;
        connection_status: string;
        checklist: { id: string; pass: boolean; label: string }[];
        progress: { passed: number; total: number };
      }>("/projects/casa_leon/diagnostics")
    : null;

  return (
    <div className="space-y-4">
      <Link href="/control/mm/proyectos/casa-leon" className="text-sm text-amber-400 hover:underline">
        ← Casa León
      </Link>
      <h2 className="text-xl font-semibold">Diagnóstico técnico</h2>
      <p className="text-sm text-[#a8b0bc]">
        Verificaciones de conexión, seguridad y herramientas. No afectan el estado operativo cuando el proyecto ya está
        activo.
      </p>
      <CasaLeonDiagnosticsPanel initial={initial?.ok ? (initial.data as never) : null} />
    </div>
  );
}
