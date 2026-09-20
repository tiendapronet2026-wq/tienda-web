import Link from "next/link";
import { PageTitle } from "@/components/platform/PageTitle";
import { StatGrid } from "@/components/platform/StatGrid";
import { PersistenceSourceBadge } from "@/components/platform/PersistenceSourceBadge";
import { controlRequests } from "@/lib/mock/control-data";
import { isExplicitDevMockMode, loadControlTenantsForPanel } from "@/lib/platform/tenant-loader";

export default async function ControlHomePage() {
  const { source, tenants } = await loadControlTenantsForPanel();
  const mockMode = isExplicitDevMockMode();

  return (
    <>
      {mockMode ? null : <PersistenceSourceBadge source={source} />}
      <PageTitle
        title="TiendaPro Control"
        description={
          mockMode
            ? "Plataforma del propietario: demo con datos ficticios (desarrollo)."
            : "Plataforma del propietario: tenants y operaciones desde Supabase TiendaPro."
        }
      />
      <StatGrid
        stats={[
          { label: "Tenants", value: tenants.length },
          { label: "Solicitudes abiertas", value: mockMode ? controlRequests.length : 0 },
          { label: "Agentes", value: mockMode ? 3 : "—", hint: mockMode ? "Pipeline local" : "Sin mock" },
          { label: "Persistencia", value: mockMode ? "Mock" : "Supabase" },
        ]}
      />
      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="text-lg font-semibold text-foreground">Clientes (tenants)</h2>
          <ul className="mt-3 space-y-2">
            {tenants.map((t) => (
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
            El panel del tenant vive en <strong>/app</strong> (módulos contratados, CRM, informes). Requiere
            membresía activa cuando <code className="text-xs">TIENDAPRO_PLATFORM_DB=1</code>.
          </p>
          <Link href="/app" className="mt-4 inline-flex text-sm font-semibold text-brand-secondary">
            Abrir App cliente →
          </Link>
        </section>
      </div>
    </>
  );
}
