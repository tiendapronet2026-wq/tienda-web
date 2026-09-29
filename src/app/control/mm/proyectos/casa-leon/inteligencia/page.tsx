import Link from "next/link";
import { CasaLeonIntelligencePanel } from "@/components/mm-control/CasaLeonIntelligencePanel";

const tabs = [
  { href: "/control/mm/proyectos/casa-leon", label: "Resumen" },
  { href: "/control/mm/proyectos/casa-leon/inteligencia", label: "Inteligencia" },
  { href: "/control/mm/proyectos/casa-leon/diagnostico", label: "Diagnóstico" },
];

export default function CasaLeonIntelligencePage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/control/mm/proyectos/casa-leon" className="text-sm text-amber-400 hover:underline">
          ← Casa León
        </Link>
        <h2 className="mt-2 text-2xl font-semibold">Inteligencia operativa</h2>
        <p className="mt-1 text-sm text-[#a8b0bc]">
          Snapshot agregado vía M&M (READ/ANALYZE, sin PII, costo $0).
        </p>
      </div>

      <nav className="flex gap-2 border-b border-[#2a2f36] pb-2">
        {tabs.map((t) => (
          <Link key={t.href} href={t.href} className="rounded px-3 py-1.5 text-sm text-[#a8b0bc] hover:bg-[#1a1e24]">
            {t.label}
          </Link>
        ))}
      </nav>

      <CasaLeonIntelligencePanel />
    </div>
  );
}
