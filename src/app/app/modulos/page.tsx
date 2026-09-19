import { PageTitle } from "@/components/platform/PageTitle";
import { ModuleCatalogCard } from "@/components/platform/ModuleCatalogCard";
import { getDemoTenant } from "@/lib/tenant/context";
import { resolveEntitlements } from "@/lib/plans/resolve-modules";
import { getPlan } from "@/lib/plans/catalog";
import { MODULE_REGISTRY } from "@/lib/modules/registry";
import type { ModuleId } from "@/lib/modules/registry";

export default function AppModulosPage() {
  const tenant = getDemoTenant();
  const resolved = resolveEntitlements(tenant.entitlements);
  const plan = getPlan(tenant.entitlements.planId);

  return (
    <>
      <PageTitle
        title="Módulos contratados"
        description={`Plan ${plan.name}. Activación efectiva según dependencias e integraciones opcionales.`}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        {resolved.catalog.map((row) => (
          <ModuleCatalogCard
            key={row.moduleId}
            module={MODULE_REGISTRY[row.moduleId as ModuleId]}
            state={row.state}
            reason={row.reason}
            integrations={row.integrations}
          />
        ))}
      </div>
    </>
  );
}
