import Link from "next/link";
import type { ModuleDefinition } from "@/lib/modules/registry";
import type { ModuleActivationState } from "@/lib/modules/registry";

const stateStyles: Record<ModuleActivationState, string> = {
  active: "bg-success-soft text-success",
  inactive: "bg-surface-muted text-muted",
  suspended: "bg-warning-soft text-warning",
};

const maturityLabel = {
  scaffold: "Estructura",
  demo: "Demo",
  "production-ready": "Listo",
};

export function ModuleCatalogCard({
  module,
  state,
  reason,
}: {
  module: ModuleDefinition;
  state?: ModuleActivationState;
  reason?: string;
}) {
  return (
    <article className="flex h-full flex-col rounded-[var(--radius-xl)] border border-border bg-surface p-6 shadow-[var(--shadow-sm)]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-lg font-semibold text-foreground">{module.name}</h3>
        <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-[11px] font-semibold uppercase text-brand">
          {maturityLabel[module.maturity]}
        </span>
      </div>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-text-secondary">{module.summary}</p>
      {module.dependencies.length > 0 && (
        <p className="mt-3 text-xs text-muted">Depende de: {module.dependencies.join(", ")}</p>
      )}
      {state && (
        <p className={`mt-3 inline-flex w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold ${stateStyles[state]}`}>
          {state === "active" ? "Activo" : state === "suspended" ? "Suspendido" : "Inactivo"}
          {reason ? ` · ${reason}` : ""}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {module.demoPath && (
          <Link href={module.demoPath} className="text-sm font-semibold text-brand">
            Demo ficticia →
          </Link>
        )}
        {module.panelPath && state === "active" && (
          <Link href={module.panelPath} className="text-sm font-medium text-text-secondary hover:text-brand">
            Panel
          </Link>
        )}
      </div>
    </article>
  );
}
