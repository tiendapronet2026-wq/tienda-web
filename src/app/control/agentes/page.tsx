import Link from "next/link";
import { PageTitle } from "@/components/platform/PageTitle";
import { mockAgents } from "@/lib/mock/panel-data";

export default function ControlAgentesPage() {
  return (
    <>
      <PageTitle
        title="Centro de agentes"
        description="Orquestación propietario. Pipeline: interpretación → validación → reglas → herramientas → auditoría."
      />
      <ul className="space-y-3">
        {mockAgents.map((a) => (
          <li key={a.id} className="rounded-xl border border-border bg-surface p-5 text-sm">
            <p className="font-semibold text-foreground">{a.name}</p>
            <p className="text-text-secondary">{a.model} · {a.status}</p>
          </li>
        ))}
      </ul>
      <Link href="/demos/chatbot" className="mt-4 inline-flex text-sm font-semibold text-brand">
        Showroom chatbot (demo) →
      </Link>
    </>
  );
}
