export type ProviderLinkStatus = "unknown" | "pending" | "connected" | "simulated" | "error";

export type InstallationLifecycleStatus =
  | "draft"
  | "provisioning"
  | "live"
  | "paused"
  | "failed"
  | "archived";

export type InstallationTemplateRow = {
  templateId: string;
  name: string;
  description: string;
  businessType: string;
  status: "available" | "beta" | "coming_soon";
  defaultModules: string[];
};

export type PlatformInstallationRow = {
  id: string;
  tenantId: string | null;
  companyName: string;
  companySlug: string;
  templateId: string;
  templateName: string;
  primaryDomain: string | null;
  environment: string;
  lifecycleStatus: InstallationLifecycleStatus;
  installedVersion: string | null;
  enabledModules: string[];
  githubStatus: ProviderLinkStatus;
  vercelStatus: ProviderLinkStatus;
  supabaseStatus: ProviderLinkStatus;
  githubMeta: Record<string, unknown>;
  vercelMeta: Record<string, unknown>;
  supabaseMeta: Record<string, unknown>;
  brandingConfig: Record<string, unknown>;
  isReference: boolean;
  updatedAt: string;
};

export type InstallationOperationRow = {
  id: string;
  operationType: string;
  environment: string;
  status: string;
  summary: string;
  createdAt: string;
};

export function parseProviderStatus(meta: Record<string, unknown> | null | undefined): ProviderLinkStatus {
  const s = meta?.status;
  if (s === "connected" || s === "pending" || s === "simulated" || s === "error") return s;
  return "unknown";
}
