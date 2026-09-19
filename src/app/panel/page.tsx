import Link from "next/link";
import { PageTitle } from "@/components/platform/PageTitle";
import { StatGrid } from "@/components/platform/StatGrid";
import { ModuleCatalogCard } from "@/components/platform/ModuleCatalogCard";
import { panelStats, mockTasks, mockProjects } from "@/lib/mock/panel-data";
import { getDemoTenant } from "@/lib/tenant/context";
import { resolveActiveModules } from "@/lib/plans/activation";
import { getPlan } from "@/lib/plans/catalog";
import { MODULE_REGISTRY } from "@/lib/modules/registry";
import type { ModuleId } from "@/lib/modules/registry";

export default function PanelHomePage() {
  const tenant = getDemoTenant();
  const plan = getPlan(tenant.entitlements.planId);
  const { active, catalog } = resolveActiveModules(tenant.entitlements);
  const activeModules = catalog
    .filter((c) => c.state === "active")
    .slice(0, 4)
    .map((c) => MODULE_REGISTRY[c.moduleId as ModuleId]);

  return (
    <>
      <PageTitle
        title="Resumen"
        description={`Centro de operaciones · ${tenant.displayName} · plan ${plan.name} (demo).`}
      />
      <StatGrid
        stats={[
          { label: "Módulos activos", value: active.length },
          { label: "Proyectos abiertos", value: panelStats.openProjects },
          { label: "Tareas esta semana", value: panelStats.tasksDueWeek },
          { label: "Modo despliegue", value: tenant.config.deploymentMode },
        ]}
      />

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-foreground">Módulos activos (muestra)</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {activeModules.map((m) => (
            <ModuleCatalogCard key={m.id} module={m} state="active" />
          ))}
        </div>
        <Link href="/panel/modulos" className="mt-3 inline-block text-sm font-semibold text-brand">
          Gestionar módulos y plan →
        </Link>
      </section>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="text-lg font-semibold text-foreground">Proyectos recientes</h2>
          <ul className="mt-3 space-y-2">
            {mockProjects.map((p) => (
              <li key={p.id} className="rounded-lg border border-border bg-surface px-4 py-3 text-sm">
                <p className="font-medium text-foreground">{p.name}</p>
                <p className="text-text-secondary">{p.client} · {p.progress}%</p>
              </li>
            ))}
          </ul>
          <Link href="/panel/proyectos" className="mt-3 inline-block text-sm font-semibold text-brand">
            Ver proyectos →
          </Link>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">Tareas</h2>
          <ul className="mt-3 space-y-2">
            {mockTasks.slice(0, 3).map((t) => (
              <li key={t.id} className="rounded-lg border border-border bg-surface px-4 py-3 text-sm">
                <p className="font-medium text-foreground">{t.title}</p>
                <p className="text-text-secondary">{t.status} · {t.due}</p>
              </li>
            ))}
          </ul>
          <Link href="/panel/tareas" className="mt-3 inline-block text-sm font-semibold text-brand">
            Ver tareas →
          </Link>
        </section>
      </div>
    </>
  );
}
