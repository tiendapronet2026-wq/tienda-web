import Link from "next/link";
import { PageTitle } from "@/components/platform/PageTitle";
import { StatGrid } from "@/components/platform/StatGrid";
import { controlRequests, controlTenants } from "@/lib/mock/control-data";

export default function ControlHomePage() {
  return (
    <>
      <PageTitle
        title="TiendaPro Control"
        description="Plataforma del propietario: tenants, agentes, despliegues e informes. Demo pública sin login."
      />
      <StatGrid
        stats={[
          { label: "Tenants demo", value: controlTenants.length },
          { label: "Solicitudes abiertas", value: controlRequests.length },
          { label: "Agentes", value: 3, hint: "Pipeline local" },
          { label: "Auth real", value: "Pendiente", hint: "claims + RLS" },
        ]}
      />
      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="text-lg font-semibold text-foreground">Clientes (tenants)</h2>
          <ul className="mt-3 space-y-2">
            {controlTenants.map((t) => (
              <li key={t.id} className="rounded-lg border border-border bg-surface px-4 py-3 text-sm">
                <p className="font-medium text-foreground">{t.name}</p>
                <p className="text-text-secondary">
                  {t.plan} · {t.modulesActive} módulos · {t.status}
                </p>
              </li>
            ))}
          </ul>
          <Link href="/control/clientes" className="mt-3 inline-block text-sm font-semibold text-brand">
            Ver clientes →
          </Link>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">App cliente SaaS</h2>
          <p className="mt-2 text-sm text-text-secondary">
            El panel del tenant vive en <strong>/app</strong> (módulos contratados, CRM, informes). No confundir con
            Control.
          </p>
          <Link href="/app" className="mt-4 inline-flex text-sm font-semibold text-brand-secondary">
            Abrir demo App cliente →
          </Link>
        </section>
      </div>
    </>
  );
}
