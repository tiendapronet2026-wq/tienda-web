import Link from "next/link";
import { PageTitle } from "@/components/platform/PageTitle";
import { StatGrid } from "@/components/platform/StatGrid";
import { ModuleCatalogCard } from "@/components/platform/ModuleCatalogCard";
import { getDemoTenant } from "@/lib/tenant/context";
import { resolveEntitlements } from "@/lib/plans/resolve-modules";
import { getPlan } from "@/lib/plans/catalog";
import { MODULE_REGISTRY } from "@/lib/modules/registry";
import type { ModuleId } from "@/lib/modules/registry";

export default function AppHomePage() {
  const tenant = getDemoTenant();
  const plan = getPlan(tenant.entitlements.planId);
  const resolved = resolveEntitlements(tenant.entitlements);
  const sample = resolved.catalog.filter((c) => c.state === "active").slice(0, 3);

  return (
    <>
      <PageTitle title="Resumen tenant" description={`Plan ${plan.name} · precios de ejemplo, no tarifa final.`} />
      <StatGrid
        stats={[
          { label: "Módulos activos", value: resolved.active.length },
          { label: "Suspendidos", value: tenant.entitlements.suspended.length },
          { label: "Tenant", value: tenant.tenantId.slice(0, 12) + "…" },
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
