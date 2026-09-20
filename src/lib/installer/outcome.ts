import type { InstallationResourceGrant } from "@/lib/installer/grants";
import type { InstallRunResult } from "@/lib/installer/manifest";
import type { InstallationLifecycleStatus } from "@/lib/platform/installations/types";
import { TIENDAPRO_AUTHORIZED_LINK_TARGETS } from "@/lib/installer/providers/authorized";

const PIPELINE_REQUIRED_STEPS = [
  "providers.github.permissions",
  "providers.vercel.permissions",
  "providers.supabase.permissions",
  "github.prepare_repo",
  "supabase.project",
  "supabase.migrations",
  "vercel.project",
  "security.isolation",
  "domain.bind",
  "deploy",
  "smoke_tests",
] as const;

export function isPipelineExecutionComplete(result: InstallRunResult): boolean {
  if (result.dryRun || result.manifest.runMode !== "existing_resources") return false;
  return PIPELINE_REQUIRED_STEPS.every((name) => {
    const s = result.steps.find((x) => x.step === name);
    return s?.status === "ok";
  });
}

/** @deprecated use isPipelineExecutionComplete + classifyInstallationOutcome */
export function isRealInstallationComplete(result: InstallRunResult): boolean {
  return isPipelineExecutionComplete(result);
}

export function grantUsesPlatformTiendaProStack(grant: InstallationResourceGrant): boolean {
  const g = TIENDAPRO_AUTHORIZED_LINK_TARGETS;
  return (
    grant.githubRepo.toLowerCase() === g.githubRepo.toLowerCase() &&
    grant.vercelProject.toLowerCase() === g.vercelProject.toLowerCase() &&
    grant.supabaseProjectRef.toLowerCase() === g.supabaseProjectRef.toLowerCase()
  );
}

export type InstallationOutcome = {
  pipelineComplete: boolean;
  lifecycleStatus: InstallationLifecycleStatus;
  summary: string;
  isIndependentLive: boolean;
};

export function classifyInstallationOutcome(
  result: InstallRunResult,
  grant: InstallationResourceGrant
): InstallationOutcome {
  const pipelineComplete = isPipelineExecutionComplete(result);
  if (!pipelineComplete) {
    return {
      pipelineComplete: false,
      lifecycleStatus: "failed",
      summary: "Instalación incompleta — revisar pasos con error",
      isIndependentLive: false,
    };
  }

  const isolation = result.steps.find((s) => s.step === "security.isolation");
  if (isolation?.status === "failed") {
    return {
      pipelineComplete: true,
      lifecycleStatus: "failed",
      summary: isolation.message,
      isIndependentLive: false,
    };
  }

  const platformTest =
    grant.resourceTier === "platform_test" || grantUsesPlatformTiendaProStack(grant);

  if (platformTest) {
    return {
      pipelineComplete: true,
      lifecycleStatus: "preview_validated",
      summary:
        "Prueba técnica validada en infra TiendaPro — no constituye empresa independiente ni live de cliente",
      isIndependentLive: false,
    };
  }

  return {
    pipelineComplete: true,
    lifecycleStatus: "live",
    summary: "Tienda independiente desplegada en recursos propios del cliente",
    isIndependentLive: true,
  };
}
