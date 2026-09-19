import { PageTitle } from "@/components/platform/PageTitle";
import { mockAgents } from "@/lib/mock/panel-data";
import Link from "next/link";

export default function PanelAgentesPage() {
  return (
    <>
      <PageTitle
        title="Agentes"
        description="Centro de coordinación local. Capas: interpretación → validación → reglas → herramientas → auditoría."
      />
      <p className="mb-6 text-sm text-text-secondary">
        Código en{" "}
        <code className="rounded bg-surface-muted px-1.5 py-0.5 text-xs">src/lib/agents/</code>. Sin WhatsApp, Instagram
        ni APIs externas activas.
      </p>
      <ul className="space-y-3">
        {mockAgents.map((a) => (
          <li key={a.id} className="rounded-xl border border-border bg-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-foreground">{a.name}</p>
              <span className="text-xs font-medium text-muted">{a.model}</span>
            </div>
            <p className="mt-1 text-sm text-text-secondary">Estado: {a.status}</p>
            <p className="mt-1 text-sm text-text-secondary">Último informe: {a.lastReport}</p>
          </li>
        ))}
      </ul>
      <Link href="/demos/chatbot" className="mt-6 inline-flex text-sm font-semibold text-brand">
        Probar pipeline en demo chatbot →
      </Link>
    </>
  );
}
