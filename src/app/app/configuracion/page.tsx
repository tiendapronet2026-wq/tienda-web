import { PageTitle } from "@/components/platform/PageTitle";
import { getDemoTenant } from "@/lib/tenant/context";
import { getPlan } from "@/lib/plans/catalog";
import { resolveEntitlements } from "@/lib/plans/resolve-modules";

export default function AppConfigPage() {
  const tenant = getDemoTenant();
  const plan = getPlan(tenant.entitlements.planId);
  const { active } = resolveEntitlements(tenant.entitlements);

  return (
    <>
      <PageTitle title="Configuración tenant" description="Personalización por cliente (demo)." />
      <div className="space-y-3 rounded-xl border border-border bg-surface p-6 text-sm text-text-secondary">
        <p>Plan: {plan.name} (referencia, no precio comercial definitivo)</p>
        <p>Módulos activos: {active.join(", ")}</p>
        <p>Dominio custom: {tenant.config.customDomain ?? "pendiente"}</p>
      </div>
    </>
  );
}
