import type { ModuleShowcaseStatus } from "@/lib/modules/registry";

const labels: Record<ModuleShowcaseStatus, { text: string; className: string }> = {
  demo: { text: "Demo", className: "bg-brand-secondary-soft text-brand-secondary" },
  functional: { text: "Funcional", className: "bg-success-soft text-success" },
  "coming-soon": { text: "Próximamente", className: "bg-surface-muted text-muted" },
};

export function ShowcaseStatusBadge({ status }: { status: ModuleShowcaseStatus }) {
  const l = labels[status];
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${l.className}`}>
      {l.text}
    </span>
  );
}
