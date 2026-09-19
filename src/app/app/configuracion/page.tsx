import { PageTitle } from "@/components/platform/PageTitle";
import { PersistenceSourceBadge } from "@/components/platform/PersistenceSourceBadge";
import { getPlan } from "@/lib/plans/catalog";
import { loadResolvedModulesForApp } from "@/lib/platform/tenant-loader";

export default async function AppConfigPage() {
  const { source, entitlements, resolved } = await loadResolvedModulesForApp();
  const plan = getPlan(entitlements.planId);

  return (
    <>
      <PersistenceSourceBadge source={source} />
      <PageTitle title="Configuración tenant" description="Personalización por cliente (demo)." />
      <div className="space-y-3 rounded-xl border border-border bg-surface p-6 text-sm text-text-secondary">
        <p>Plan: {plan.name} (modelo configurable, no tarifa publicada)</p>
        <p>Módulos activos: {resolved.active.join(", ") || "ninguno"}</p>
        <p>Fuente datos: {source}</p>
        <p>Dominio custom: pendiente de configuración tras migración</p>
      </div>
    </>
  );
}
