export type InstallationManifest = {
  version: "1";
  companyName: string;
  companySlug: string;
  templateId: string;
  primaryDomain: string | null;
  enabledModules: string[];
  branding: {
    logoUrl?: string;
    primaryColor?: string;
    fontFamily?: string;
  };
  providers: {
    github: { repo?: string; connected: boolean; simulated: boolean };
    vercel: { project?: string; connected: boolean; simulated: boolean };
    supabase: { projectRef?: string; connected: boolean; simulated: boolean };
  };
  dryRun: boolean;
};

export type InstallStepResult = {
  step: string;
  status: "ok" | "skipped" | "failed" | "simulated";
  message: string;
};

export type InstallRunResult = {
  ok: boolean;
  dryRun: boolean;
  steps: InstallStepResult[];
  manifest: InstallationManifest;
};

export function slugifyCompanyName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export function validateManifest(input: Partial<InstallationManifest>): string[] {
  const errors: string[] = [];
  if (!input.companyName || input.companyName.trim().length < 2) {
    errors.push("Nombre de empresa inválido.");
  }
  if (!input.templateId) errors.push("Plantilla requerida.");
  if (!input.enabledModules?.length) errors.push("Seleccioná al menos un módulo.");
  if (input.primaryDomain && !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(input.primaryDomain)) {
    errors.push("Dominio con formato inválido.");
  }
  return errors;
}

export function buildManifestFromWizardPayload(
  payload: Record<string, unknown>,
  options: { dryRun: boolean }
): InstallationManifest {
  const companyName = String(payload.companyName ?? "").trim();
  const companySlug = String(payload.companySlug ?? slugifyCompanyName(companyName));
  const templateId = String(payload.templateId ?? "ecommerce-store-v1");
  const enabledModules = Array.isArray(payload.modules)
    ? (payload.modules as string[])
    : [];
  const primaryDomain = payload.primaryDomain ? String(payload.primaryDomain) : null;

  return {
    version: "1",
    companyName,
    companySlug,
    templateId,
    primaryDomain,
    enabledModules,
    branding: {
      logoUrl: payload.logoUrl ? String(payload.logoUrl) : undefined,
      primaryColor: payload.primaryColor ? String(payload.primaryColor) : undefined,
      fontFamily: payload.fontFamily ? String(payload.fontFamily) : undefined,
    },
    providers: {
      github: {
        repo: payload.githubRepo ? String(payload.githubRepo) : undefined,
        connected: Boolean(payload.githubConnected),
        simulated: options.dryRun || Boolean(payload.githubSimulated),
      },
      vercel: {
        project: payload.vercelProject ? String(payload.vercelProject) : undefined,
        connected: Boolean(payload.vercelConnected),
        simulated: options.dryRun || Boolean(payload.vercelSimulated),
      },
      supabase: {
        projectRef: payload.supabaseRef ? String(payload.supabaseRef) : undefined,
        connected: Boolean(payload.supabaseConnected),
        simulated: options.dryRun || Boolean(payload.supabaseSimulated),
      },
    },
    dryRun: options.dryRun,
  };
}
