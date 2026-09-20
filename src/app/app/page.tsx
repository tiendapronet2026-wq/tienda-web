import Link from "next/link";
import { PageTitle } from "@/components/platform/PageTitle";
import { StatGrid } from "@/components/platform/StatGrid";
import { ModuleCatalogCard } from "@/components/platform/ModuleCatalogCard";
import { PersistenceSourceBadge } from "@/components/platform/PersistenceSourceBadge";
import { MODULE_REGISTRY } from "@/lib/modules/registry";
import type { ModuleId } from "@/lib/modules/registry";
import { getPlan } from "@/lib/plans/catalog";
import { loadResolvedModulesForApp } from "@/lib/platform/tenant-loader";

export default async function AppHomePage() {
  const { source, entitlements, displayName, resolved } = await loadResolvedModulesForApp();
  const plan = getPlan(entitlements.planId);
  const sample = resolved.catalog.filter((c) => c.state === "active").slice(0, 3);

  return (
    <>
      <PersistenceSourceBadge source={source} />
      <PageTitle title="Resumen tenant" description={`${displayName} · plan ${plan.name} (modelo configurable).`} />
      <StatGrid
        stats={[
          { label: "Módulos activos", value: resolved.active.length },
          { label: "Suspendidos", value: entitlements.suspended.length },
          { label: "Tenant", value: entitlements.tenantId.slice(0, 12) + "…" },
          { label: "Integraciones", value: "Dinámicas", hint: "Según módulos activos" },
        ]}
      />
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-foreground">Módulos activos</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {sample.map((row) => (
            <ModuleCatalogCard
              key={row.moduleId}
              module={MODULE_REGISTRY[row.moduleId as ModuleId]}
              state={row.state}
              integrations={row.integrations}
            />
          ))}
        </div>
        <Link href="/app/modulos" className="mt-3 inline-block text-sm font-semibold text-brand-secondary">
          Ver catálogo tenant →
        </Link>
      </section>
    </>
  );
}
