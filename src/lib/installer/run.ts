import type { InstallationManifest, InstallRunResult, InstallStepResult } from "@/lib/installer/manifest";
import { validateManifest } from "@/lib/installer/manifest";
import { brandingConfigToStoreEnvJson } from "@/lib/branding/export-env-json";
import {
  grantHasScope,
  loadActiveInstallationGrant,
  manifestMatchesGrant,
  type InstallationResourceGrant,
} from "@/lib/installer/grants";
import {
  ensureGitBranchFromDefault,
  verifyGithubRepoAccess,
  verifyTemplateArtifactInRepo,
} from "@/lib/installer/providers/github";
import {
  createVercelDeployment,
  getVercelProjectId,
  upsertVercelEnvVar,
  verifyVercelDomainAttached,
  verifyVercelProjectAccess,
} from "@/lib/installer/providers/vercel";
import { verifySupabaseMigrationsPresent, verifySupabaseProjectAccess } from "@/lib/installer/providers/supabase";
import { runInstallSmokeTests } from "@/lib/installer/providers/smoke";

function step(
  stepName: string,
  status: InstallStepResult["status"],
  message: string
): InstallStepResult {
  return { step: stepName, status, message };
}

function provisioningEnabled(): boolean {
  return process.env.INSTALLER_ALLOW_PROVISION === "1";
}

export type InstallPipelineExtras = {
  grant?: InstallationResourceGrant | null;
  deploymentUrl?: string;
};

const REAL_INSTALL_REQUIRED_STEPS = [
  "providers.github.permissions",
  "providers.vercel.permissions",
  "providers.supabase.permissions",
  "github.prepare_repo",
  "supabase.project",
  "supabase.migrations",
  "vercel.project",
  "domain.bind",
  "deploy",
  "smoke_tests",
] as const;

export function isRealInstallationComplete(result: InstallRunResult): boolean {
  if (result.dryRun || result.manifest.runMode !== "existing_resources") return false;
  return REAL_INSTALL_REQUIRED_STEPS.every((name) => {
    const s = result.steps.find((x) => x.step === name);
    return s?.status === "ok";
  });
}

async function resolveGrant(manifest: InstallationManifest): Promise<InstallationResourceGrant | null> {
  if (!manifest.installationId) return null;
  return loadActiveInstallationGrant(manifest.installationId, manifest.installEnvironment);
}

/** Verifica acceso real a proveedores (tokens solo servidor). */
export async function verifyProviderPermissions(
  manifest: InstallationManifest,
  grant?: InstallationResourceGrant | null
): Promise<InstallStepResult[]> {
  const results: InstallStepResult[] = [];
  const { github, vercel, supabase } = manifest.providers;

  const entries = [
    async () => {
      if (manifest.dryRun || github.simulated) {
        return step("providers.github.permissions", "simulated", "Permisos github simulados OK");
      }
      if (!github.connected) {
        return step("providers.github.permissions", "skipped", "github no vinculado — completá verificación");
      }
      const r = await verifyGithubRepoAccess(github.repo, grant);
      return step("providers.github.permissions", r.status === "ok" ? "ok" : r.status, r.message);
    },
    async () => {
      if (manifest.dryRun || vercel.simulated) {
        return step("providers.vercel.permissions", "simulated", "Permisos vercel simulados OK");
      }
      if (!vercel.connected) {
        return step("providers.vercel.permissions", "skipped", "vercel no vinculado — completá verificación");
      }
      const r = await verifyVercelProjectAccess(vercel.project, grant);
      return step("providers.vercel.permissions", r.status === "ok" ? "ok" : r.status, r.message);
    },
    async () => {
      if (manifest.dryRun || supabase.simulated) {
        return step("providers.supabase.permissions", "simulated", "Permisos supabase simulados OK");
      }
      if (!supabase.connected) {
        return step("providers.supabase.permissions", "skipped", "supabase no vinculado — completá verificación");
      }
      const r = await verifySupabaseProjectAccess(supabase.projectRef, grant);
      return step("providers.supabase.permissions", r.status === "ok" ? "ok" : r.status, r.message);
    },
  ];

  for (const fn of entries) {
    results.push(await fn());
  }

  return results;
}

async function prepareRepositoryFromTemplate(
  manifest: InstallationManifest,
  grant: InstallationResourceGrant | null
): Promise<InstallStepResult> {
  if (manifest.dryRun) {
    return step(
      "github.prepare_repo",
      "simulated",
      `Plantilla ${manifest.templateId} → ${manifest.providers.github.repo ?? "repo"} (simulado)`
    );
  }

  if (manifest.runMode !== "existing_resources") {
    if (!provisioningEnabled()) {
      return step("github.prepare_repo", "skipped", "Provisionamiento repo no autorizado");
    }
    return step("github.prepare_repo", "skipped", "Creación de repo pendiente (solo recursos existentes operativo)");
  }

  const repo = manifest.providers.github.repo;
  if (!repo) return step("github.prepare_repo", "failed", "Repo GitHub requerido");

  const template = await verifyTemplateArtifactInRepo(repo, manifest.templateId, grant);
  if (!template.ok) {
    return step("github.prepare_repo", template.status === "skipped" ? "skipped" : "failed", template.message);
  }

  const branch = grant?.deployBranch ?? `install/${manifest.companySlug}`;
  const branchResult = await ensureGitBranchFromDefault(repo, branch);
  if (!branchResult.ok) {
    return step("github.prepare_repo", branchResult.status === "skipped" ? "skipped" : "failed", branchResult.message);
  }

  return step("github.prepare_repo", "ok", `${template.message}; ${branchResult.message}`);
}

async function configureIsolatedSupabase(
  manifest: InstallationManifest,
  grant: InstallationResourceGrant | null
): Promise<InstallStepResult> {
  if (manifest.dryRun) {
    return step(
      "supabase.project",
      "simulated",
      `Proyecto ${manifest.providers.supabase.projectRef ?? "ref"} (simulado)`
    );
  }

  if (manifest.runMode !== "existing_resources") {
    return step("supabase.project", "skipped", "Creación de proyectos Supabase no operativa");
  }

  const ref = manifest.providers.supabase.projectRef;
  if (!ref) return step("supabase.project", "failed", "Supabase ref requerido");

  const r = await verifySupabaseProjectAccess(ref, grant);
  return step("supabase.project", r.status === "ok" ? "ok" : r.status, r.message);
}

async function applyMigrationsStep(
  manifest: InstallationManifest,
  grant: InstallationResourceGrant | null
): Promise<InstallStepResult> {
  if (manifest.dryRun) {
    return step(
      "supabase.migrations",
      "simulated",
      `Migraciones módulos: ${manifest.enabledModules.join(", ")} (simulado)`
    );
  }

  if (manifest.runMode !== "existing_resources") {
    return step("supabase.migrations", "skipped", "Aplicación remota de migraciones no operativa");
  }

  if (grant && !grantHasScope(grant, "migrations_verify")) {
    return step("supabase.migrations", "skipped", "Grant sin scope migrations_verify");
  }

  const ref = manifest.providers.supabase.projectRef;
  if (!ref) return step("supabase.migrations", "failed", "Supabase ref requerido");

  const r = await verifySupabaseMigrationsPresent(ref, grant);
  return step("supabase.migrations", r.status === "ok" ? "ok" : r.status, r.message);
}

async function configureVercelProjectStep(
  manifest: InstallationManifest,
  grant: InstallationResourceGrant | null
): Promise<InstallStepResult> {
  if (manifest.dryRun) {
    return step("vercel.project", "simulated", `Env Vercel (simulado)`);
  }

  if (manifest.runMode !== "existing_resources") {
    return step("vercel.project", "skipped", "Creación de proyectos Vercel no operativa");
  }

  if (grant && !grantHasScope(grant, "env_write")) {
    return step("vercel.project", "skipped", "Grant sin scope env_write");
  }

  const project = manifest.providers.vercel.project;
  if (!project) return step("vercel.project", "failed", "Proyecto Vercel requerido");

  const access = await verifyVercelProjectAccess(project, grant);
  if (!access.ok) {
    return step("vercel.project", access.status === "skipped" ? "skipped" : "failed", access.message);
  }

  const projectId = await getVercelProjectId(project);
  if (!projectId) return step("vercel.project", "failed", "No se resolvió project id Vercel");

  const branch = grant?.deployBranch ?? `install/${manifest.companySlug}`;
  const targets = manifest.installEnvironment === "production" ? (["production"] as const) : (["preview"] as const);
  const brandingJson = brandingConfigToStoreEnvJson(manifest.branding);

  const envVars: Array<{ key: string; value: string }> = [
    { key: "STORE_INDEPENDENT", value: "1" },
    { key: "STORE_BRANDING_JSON", value: brandingJson },
    { key: "TIENDAPRO_INSTALLATION_SLUG", value: manifest.companySlug },
    { key: "NEXT_PUBLIC_INSTALLATION_SLUG", value: manifest.companySlug },
  ];

  for (const env of envVars) {
    const r = await upsertVercelEnvVar({
      projectId,
      key: env.key,
      value: env.value,
      targets: [...targets],
      gitBranch: branch,
    });
    if (!r.ok) {
      return step("vercel.project", r.status === "skipped" ? "skipped" : "failed", r.message);
    }
  }

  return step("vercel.project", "ok", `Variables de tienda independiente en rama ${branch}`);
}

async function bindDomainStep(
  manifest: InstallationManifest,
  grant: InstallationResourceGrant | null,
  deploymentUrl?: string
): Promise<InstallStepResult> {
  if (manifest.dryRun) {
    return step(
      "domain.bind",
      "simulated",
      manifest.primaryDomain ? `Dominio ${manifest.primaryDomain} (simulado)` : "Sin dominio custom"
    );
  }

  if (manifest.runMode !== "existing_resources") {
    return step("domain.bind", "skipped", "DNS no operativo fuera de recursos existentes");
  }

  if (manifest.installEnvironment === "preview") {
    return step(
      "domain.bind",
      "ok",
      deploymentUrl ? `Preview: ${deploymentUrl} (sin cambios DNS)` : "Preview sin URL aún"
    );
  }

  const domain = grant?.primaryDomain ?? manifest.primaryDomain;
  if (!domain) {
    return step("domain.bind", "skipped", "Sin dominio autorizado");
  }

  if (grant && !grantHasScope(grant, "domain_verify")) {
    return step("domain.bind", "skipped", "Grant sin scope domain_verify");
  }

  const project = manifest.providers.vercel.project;
  if (!project) return step("domain.bind", "failed", "Proyecto Vercel requerido");

  const r = await verifyVercelDomainAttached(project, domain);
  return step("domain.bind", r.status === "ok" ? "ok" : r.status, r.message);
}

async function deployStep(
  manifest: InstallationManifest,
  grant: InstallationResourceGrant | null
): Promise<InstallStepResult & { deploymentUrl?: string }> {
  if (manifest.dryRun) {
    return step("deploy", "simulated", "Deploy producción (simulado)");
  }

  if (manifest.runMode !== "existing_resources") {
    return step(
      "deploy",
      "skipped",
      provisioningEnabled() ? "Deploy pendiente de implementación" : "Deploy no autorizado"
    );
  }

  if (grant && !grantHasScope(grant, "deploy_preview") && manifest.installEnvironment === "preview") {
    return step("deploy", "skipped", "Grant sin scope deploy_preview");
  }

  const repo = manifest.providers.github.repo;
  const project = manifest.providers.vercel.project;
  if (!repo || !project) return step("deploy", "failed", "Repo y proyecto Vercel requeridos");

  const branch = grant?.deployBranch ?? `install/${manifest.companySlug}`;
  const r = await createVercelDeployment({ project, repo, ref: branch });
  return {
    ...step("deploy", r.status === "ok" ? "ok" : r.status, r.message),
    deploymentUrl: r.deploymentUrl,
  };
}

async function smokeStep(manifest: InstallationManifest, deploymentUrl?: string): Promise<InstallStepResult> {
  if (manifest.dryRun) {
    return step("smoke_tests", "simulated", "Health /productos, /login (simulado)");
  }

  if (manifest.runMode !== "existing_resources") {
    return step("smoke_tests", "skipped", "Smoke tests no ejecutados");
  }

  if (!deploymentUrl) {
    return step("smoke_tests", "skipped", "Sin URL de deploy para smoke");
  }

  const r = await runInstallSmokeTests(deploymentUrl);
  return step("smoke_tests", r.status === "ok" ? "ok" : r.status, r.message);
}

export async function runInstallationPipeline(
  manifest: InstallationManifest,
  extras?: InstallPipelineExtras
): Promise<InstallRunResult> {
  const errors = validateManifest(manifest);
  if (errors.length) {
    return {
      ok: false,
      dryRun: manifest.dryRun,
      manifest,
      steps: [step("validate", "failed", errors.join(" "))],
    };
  }

  let grant = extras?.grant ?? null;
  if (!grant && manifest.installationId) {
    grant = await resolveGrant(manifest);
  }

  if (manifest.runMode === "existing_resources" && !manifest.dryRun) {
    if (!manifest.installationId) {
      return {
        ok: false,
        dryRun: false,
        manifest,
        steps: [step("validate", "failed", "installationId requerido para instalación real")],
      };
    }
    if (!grant) {
      return {
        ok: false,
        dryRun: false,
        manifest,
        steps: [step("validate", "failed", "Sin autorización de recursos (grant) para esta instalación")],
      };
    }
    const grantErrors = manifestMatchesGrant(manifest, grant);
    if (grantErrors.length) {
      return {
        ok: false,
        dryRun: false,
        manifest,
        steps: [step("validate", "failed", grantErrors.join(" "))],
      };
    }
  }

  const providerSteps = await verifyProviderPermissions(manifest, grant);
  const prepareRepo = await prepareRepositoryFromTemplate(manifest, grant);
  const supabaseProject = await configureIsolatedSupabase(manifest, grant);
  const migrations = await applyMigrationsStep(manifest, grant);
  const vercelProject = await configureVercelProjectStep(manifest, grant);
  const deployResult = await deployStep(manifest, grant);
  const deploymentUrl = deployResult.deploymentUrl ?? extras?.deploymentUrl;
  const domain = await bindDomainStep(manifest, grant, deploymentUrl);
  const smoke = await smokeStep(manifest, deploymentUrl);

  const registerStatus: InstallStepResult["status"] =
    manifest.dryRun || manifest.runMode !== "existing_resources"
      ? "simulated"
      : isRealInstallationComplete({
          ok: false,
          dryRun: false,
          manifest,
          steps: [
            step("validate", "ok", ""),
            ...providerSteps,
            prepareRepo,
            supabaseProject,
            migrations,
            vercelProject,
            domain,
            deployResult,
            smoke,
          ],
        })
        ? "ok"
        : "skipped";

  const steps: InstallStepResult[] = [
    step("validate", "ok", "Manifiesto válido"),
    ...providerSteps,
    prepareRepo,
    supabaseProject,
    migrations,
    vercelProject,
    domain,
    deployResult,
    smoke,
    step(
      "register",
      registerStatus,
      manifest.dryRun
        ? "Registro en Control (simulado)"
        : registerStatus === "ok"
          ? "Listo para registrar live en Control"
          : "Instalación incompleta — no marcar live"
    ),
  ];

  const failed = steps.some((s) => s.status === "failed");
  const ok = !failed && (manifest.dryRun || isRealInstallationComplete({ ok: !failed, dryRun: manifest.dryRun, manifest, steps }));

  return { ok, dryRun: manifest.dryRun, manifest, steps, deploymentUrl };
}
