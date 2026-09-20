import Link from "next/link";
import type { ModuleDefinition } from "@/lib/modules/registry";
import type { ModuleActivationState } from "@/lib/modules/registry";
import { ShowcaseStatusBadge } from "@/components/platform/ShowcaseStatusBadge";
import type { ModuleIntegrationStatus } from "@/lib/plans/resolve-modules";

const stateStyles: Record<ModuleActivationState, string> = {
  active: "bg-success-soft text-success",
  inactive: "bg-surface-muted text-muted",
  suspended: "bg-warning-soft text-warning",
};

export function ModuleCatalogCard({
  module,
  state,
  reason,
  integrations,
}: {
  module: ModuleDefinition;
  state?: ModuleActivationState;
  reason?: string;
  integrations?: ModuleIntegrationStatus[];
}) {
  return (
    <article className="flex h-full flex-col rounded-[var(--radius-xl)] border border-border bg-surface p-6 shadow-[var(--shadow-sm)]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-lg font-semibold text-foreground">{module.name}</h3>
        <ShowcaseStatusBadge status={module.showcaseStatus} />
      </div>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-text-secondary">{module.summary}</p>
      {module.requiredRules.length > 0 && (
        <p className="mt-3 text-xs text-muted">
          Requisitos:{" "}
          {module.requiredRules
            .map((r) => (r.kind === "all" ? r.modules.join(" + ") : r.modules.join(" | ")))
            .join("; ")}
        </p>
      )}
      {state && (
        <p className={`mt-3 inline-flex w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold ${stateStyles[state]}`}>
          {state === "active" ? "Activo" : state === "suspended" ? "Suspendido" : "Inactivo"}
          {reason ? ` · ${reason}` : ""}
        </p>
      )}
      {integrations && integrations.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-text-secondary">
          {integrations.map((i) => (
            <li key={i.featureKey}>
              {i.enabled ? "✓" : "○"} {i.label}
              {!i.enabled && i.reason ? ` (${i.reason})` : ""}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {module.demoPath && (
          <Link href={module.demoPath} className="text-sm font-semibold text-brand">
            Showroom →
          </Link>
        )}
        {module.panelPath && state === "active" && (
          <Link href={module.panelPath} className="text-sm font-medium text-text-secondary hover:text-brand">
            App cliente
          </Link>
        )}
      </div>
    </article>
  );
}
