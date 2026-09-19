import { PageTitle } from "@/components/platform/PageTitle";
import { ModuleCatalogCard } from "@/components/platform/ModuleCatalogCard";
import { getDemoTenant } from "@/lib/tenant/context";
import { resolveActiveModules } from "@/lib/plans/activation";
import { getPlan } from "@/lib/plans/catalog";
import { MODULE_REGISTRY } from "@/lib/modules/registry";
import type { ModuleId } from "@/lib/modules/registry";

export default function PanelModulosPage() {
  const tenant = getDemoTenant();
  const { catalog } = resolveActiveModules(tenant.entitlements);
  const plan = getPlan(tenant.entitlements.planId);

  return (
    <>
      <PageTitle
        title="Módulos"
        description="Activaciones por tenant (demo). La UI oculta no reemplaza controles servidor ni RLS futuro."
      />
      <div className="mb-8 rounded-xl border border-border bg-surface-muted/50 p-4 text-sm text-text-secondary">
        <p>
          <span className="font-semibold text-foreground">Tenant:</span> {tenant.displayName} ({tenant.tenantId})
        </p>
        <p className="mt-1">
          <span className="font-semibold text-foreground">Plan:</span> {plan.name} ·{" "}
          <span className="font-semibold text-foreground">Despliegue:</span> {tenant.config.deploymentMode}
          {tenant.config.customDomain ? ` · ${tenant.config.customDomain}` : ""}
        </p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        {catalog.map((row) => {
          const mod = MODULE_REGISTRY[row.moduleId as ModuleId];
          return (
            <ModuleCatalogCard
              key={row.moduleId}
              module={mod}
              state={row.state}
              reason={row.reason}
            />
          );
        })}
      </div>
    </>
  );
}
