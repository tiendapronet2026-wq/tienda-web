import { PageTitle } from "@/components/platform/PageTitle";
import { COMMERCIAL_PLANS } from "@/lib/plans/catalog";
import { getDemoTenant } from "@/lib/tenant/context";
import { resolveActiveModules } from "@/lib/plans/activation";

export default function PanelConfigPage() {
  const tenant = getDemoTenant();
  const plan = COMMERCIAL_PLANS[tenant.entitlements.planId];
  const { active } = resolveActiveModules(tenant.entitlements);

  return (
    <>
      <PageTitle
        title="Configuración"
        description="Núcleo, plan y tenant (demo). Sin cobros ni aprovisionamiento automático de dominios/BD."
      />
      <div className="space-y-4 rounded-xl border border-border bg-surface p-6 text-sm text-text-secondary">
        <p>
          <span className="font-semibold text-foreground">Tenant ID:</span> {tenant.tenantId}
        </p>
        <p>
          <span className="font-semibold text-foreground">Plan:</span> {plan.name} — $
          {plan.baseMonthlyPrice.toLocaleString("es-AR")} ref./mes · {active.length} módulos activos
        </p>
        <p>
          <span className="font-semibold text-foreground">Add-ons demo:</span>{" "}
          {tenant.entitlements.addOnActivations.join(", ") || "ninguno"}
        </p>
        <p>
          <span className="font-semibold text-foreground">Suspendidos (datos conservados):</span>{" "}
          {tenant.entitlements.suspended.join(", ") || "ninguno"}
        </p>
        <p>
          <span className="font-semibold text-foreground">Supabase:</span> migraciones versionadas por módulo (
          <code className="text-xs">migrationNamespace</code>) — sin SQL remoto hasta acceso verificado.
        </p>
        <p>
          <span className="font-semibold text-foreground">Dominio personalizado:</span>{" "}
          {tenant.config.customDomain ?? "no configurado (fase posterior)"}
        </p>
      </div>
    </>
  );
}
