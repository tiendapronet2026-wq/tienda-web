import { SectionHeader } from "@/components/platform/SectionHeader";
import { ModuleCatalogCard } from "@/components/platform/ModuleCatalogCard";
import { MockBadge } from "@/components/platform/MockBadge";
import { moduleList } from "@/lib/modules/registry";
import { COMMERCIAL_PLANS } from "@/lib/plans/catalog";

export const metadata = {
  title: "Módulos y planes",
  description: "Catálogo modular TiendaPro SaaS — precios referencia sin cobro real.",
};

export default function ModulosPage() {
  return (
    <div className="tp-container py-12 sm:py-16">
      <SectionHeader
        eyebrow="Plataforma SaaS"
        title="Catálogo de módulos independientes"
        description="Monolito modular: núcleo común + módulos activables por plan. Cifras de ejemplo para diseño comercial — no son tarifas publicadas ni cotización vinculante."
      />
      <MockBadge className="mb-8" />

      <section className="mb-16">
        <h2 className="text-xl font-bold text-foreground">Módulos de producto</h2>
        <p className="mt-2 max-w-2xl text-sm text-text-secondary">
          Cada módulo tiene identificador, dependencias, permisos y contratos. Desactivar no borra datos.
        </p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {moduleList.map((m) => (
            <ModuleCatalogCard key={m.id} module={m} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold text-foreground">Planes (modelo configurable)</h2>
        <p className="mt-2 text-sm text-text-secondary">
          Precio base + módulos adicionales + reglas de dependencia. Sin cobros automáticos. Importes ilustrativos
          únicamente.
        </p>
        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          {(["starter", "growth", "enterprise"] as const).map((id) => {
            const plan = COMMERCIAL_PLANS[id];
            return (
              <div key={id} className="rounded-[var(--radius-xl)] border border-border bg-surface p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand">{plan.name}</p>
                <p className="mt-2 text-2xl font-bold text-foreground">
                  ${plan.baseMonthlyPrice.toLocaleString("es-AR")}
                  <span className="text-sm font-normal text-muted"> /mes (ejemplo)</span>
                </p>
                <p className="mt-2 text-sm text-text-secondary">{plan.description}</p>
                <ul className="mt-4 space-y-1 text-sm text-foreground">
                  {plan.includedModules.map((mid) => (
                    <li key={mid}>✓ {mid}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
