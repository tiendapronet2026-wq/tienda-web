import { PageTitle } from "@/components/platform/PageTitle";
import { mockClients } from "@/lib/mock/panel-data";
import { getDemoTenant } from "@/lib/tenant/context";
import { isModuleEnabledForTenant } from "@/lib/plans/resolve-modules";

export default function AppClientesPage() {
  const tenant = getDemoTenant();
  const crmOn = isModuleEnabledForTenant(tenant.entitlements, "crm");

  return (
    <>
      <PageTitle title="CRM" description="Contactos del tenant (ficticios). Distinto de clientes en TiendaPro Control." />
      {!crmOn && (
        <p className="mb-4 rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning">
          Módulo CRM inactivo para este tenant en la resolución actual — vista demo igualmente ficticia.
        </p>
      )}
      <ul className="space-y-2">
        {mockClients.map((c) => (
          <li key={c.id} className="rounded-lg border border-border bg-surface px-4 py-3 text-sm">
            {c.name} · {c.segment}
          </li>
        ))}
      </ul>
    </>
  );
}
