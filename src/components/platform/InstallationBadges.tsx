import type { InstallationLifecycleStatus, ProviderLinkStatus } from "@/lib/platform/installations/types";

const lifecycleLabels: Record<InstallationLifecycleStatus, string> = {
  draft: "Borrador",
  provisioning: "Aprovisionando",
  preview_validated: "Preview validada (prueba)",
  live: "Independiente en producción",
  paused: "Pausada",
  failed: "Error",
  archived: "Archivada",
};

const lifecycleClass: Record<InstallationLifecycleStatus, string> = {
  draft: "bg-surface-muted text-muted",
  provisioning: "bg-brand-soft text-brand",
  preview_validated: "bg-warning-soft text-warning",
  live: "bg-success-soft text-success",
  paused: "bg-warning-soft text-warning",
  failed: "bg-error-soft text-error",
  archived: "bg-surface-muted text-muted",
};

export function InstallationLifecycleBadge({ status }: { status: InstallationLifecycleStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${lifecycleClass[status]}`}
    >
      {lifecycleLabels[status]}
    </span>
  );
}

const providerLabels: Record<ProviderLinkStatus, string> = {
  connected: "Conectado",
  pending: "Pendiente",
  simulated: "Simulado",
  error: "Error",
  unknown: "—",
};

export function ProviderStatusPill({ label, status }: { label: string; status: ProviderLinkStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2 py-1 text-xs">
      <span className="font-medium text-foreground">{label}</span>
      <span className="text-muted">{providerLabels[status]}</span>
    </span>
  );
}
