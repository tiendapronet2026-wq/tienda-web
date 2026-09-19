import { PageTitle } from "@/components/platform/PageTitle";
import { ModuleCatalogCard } from "@/components/platform/ModuleCatalogCard";
import { PersistenceSourceBadge } from "@/components/platform/PersistenceSourceBadge";
import { MODULE_REGISTRY } from "@/lib/modules/registry";
import type { ModuleId } from "@/lib/modules/registry";
import { getPlan } from "@/lib/plans/catalog";
import { loadResolvedModulesForApp } from "@/lib/platform/tenant-loader";

export default async function AppModulosPage() {
  const { source, entitlements, resolved } = await loadResolvedModulesForApp();
  const plan = getPlan(entitlements.planId);

  return (
    <>
      <PersistenceSourceBadge source={source} />
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
