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
import { TIENDAPRO_AUTHORIZED_LINK_TARGETS } from "@/lib/installer/providers/authorized";
import {
  grantUsesPlatformTiendaProStack,
  isPipelineExecutionComplete,
} from "@/lib/installer/outcome";

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
  completedSteps?: Set<string>;
  /** Solo en memoria durante la acción — no persistir en logs */
  clientEnv?: { supabaseAnonKey?: string; siteUrl?: string };
};

async function reuseOrRun(
  stepName: string,
  completed: Set<string> | undefined,
  run: () => Promise<InstallStepResult>
): Promise<InstallStepResult> {
  if (completed?.has(stepName)) {
    return step(stepName, "ok", "Paso ya completado (reanudación idempotente)");
  }
  return run();
}

async function securityIsolationStep(
  manifest: InstallationManifest,
  grant: InstallationResourceGrant | null
): Promise<InstallStepResult> {
  if (manifest.dryRun) {
    return step("security.isolation", "simulated", "Aislamiento (simulado)");
  }
  if (manifest.runMode !== "existing_resources") {
    return step("security.isolation", "skipped", "No aplica");
  }
  if (!grant) {
    return step("security.isolation", "failed", "Grant requerido");
  }

  if (grant.resourceTier === "platform_test" || grantUsesPlatformTiendaProStack(grant)) {
    return step(
      "security.isolation",
      "ok",
      "Prueba técnica en infra TiendaPro — no es tienda independiente del cliente"
    );
  }

  const g = TIENDAPRO_AUTHORIZED_LINK_TARGETS;
  const leaks: string[] = [];
  if (grant.supabaseProjectRef === g.supabaseProjectRef) {
    leaks.push("Supabase apunta al proyecto TiendaPro");
  }
  if (grant.githubRepo.toLowerCase() === g.githubRepo.toLowerCase()) {
    leaks.push("GitHub apunta al repo TiendaPro");
  }
  if (grant.vercelProject.toLowerCase() === g.vercelProject.toLowerCase()) {
    leaks.push("Vercel apunta al proyecto TiendaPro");
  }
  if (manifest.companySlug === "tiendapro-reference") {
    leaks.push("Slug reservado de referencia");
  }

  if (leaks.length) {
    return step("security.isolation", "failed", leaks.join("; "));
  }

  return step("security.isolation", "ok", "Recursos propios del cliente — sin mezcla TiendaPro");
}

/** @deprecated use isPipelineExecutionComplete from outcome */
export function isRealInstallationComplete(result: InstallRunResult): boolean {
  return isPipelineExecutionComplete(result);
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
  grant: InstallationResourceGrant | null,
  extras?: InstallPipelineExtras
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

  const ref = manifest.providers.supabase.projectRef ?? grant?.supabaseProjectRef;
  const supabaseUrl = ref ? `https://${ref}.supabase.co` : null;

  const envVars: Array<{ key: string; value: string }> = [
    { key: "STORE_INDEPENDENT", value: "1" },
    { key: "STORE_BRANDING_JSON", value: brandingJson },
    { key: "TIENDAPRO_INSTALLATION_SLUG", value: manifest.companySlug },
    { key: "NEXT_PUBLIC_INSTALLATION_SLUG", value: manifest.companySlug },
  ];

  if (supabaseUrl) {
    envVars.push({ key: "NEXT_PUBLIC_SUPABASE_URL", value: supabaseUrl });
  }
  if (extras?.clientEnv?.siteUrl) {
    envVars.push({ key: "NEXT_PUBLIC_SITE_URL", value: extras.clientEnv.siteUrl });
  }
  if (extras?.clientEnv?.supabaseAnonKey) {
    envVars.push({ key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", value: extras.clientEnv.supabaseAnonKey });
  }

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
      deploymentUrl
        ? `URL desplegada: ${deploymentUrl} (sin cambios DNS)`
        : "Deploy preview pendiente de URL"
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

  const completed = extras?.completedSteps;

  let deploymentUrl = extras?.deploymentUrl;

  const providerSteps = await verifyProviderPermissions(manifest, grant);
  const prepareRepo = await reuseOrRun("github.prepare_repo", completed, () =>
    prepareRepositoryFromTemplate(manifest, grant)
  );
  const supabaseProject = await reuseOrRun("supabase.project", completed, () =>
    configureIsolatedSupabase(manifest, grant)
  );
  const migrations = await reuseOrRun("supabase.migrations", completed, () =>
    applyMigrationsStep(manifest, grant)
  );
  const vercelProject = await reuseOrRun("vercel.project", completed, () =>
    configureVercelProjectStep(manifest, grant, extras)
  );
  const isolation = await reuseOrRun("security.isolation", completed, () =>
    securityIsolationStep(manifest, grant)
  );
  const deployResult = await reuseOrRun("deploy", completed, async () => {
    const r = await deployStep(manifest, grant);
    if (r.deploymentUrl) {
      deploymentUrl = r.deploymentUrl;
    }
    return r;
  });
  const domain = await reuseOrRun("domain.bind", completed, () =>
    bindDomainStep(manifest, grant, deploymentUrl)
  );
  const smoke = await reuseOrRun("smoke_tests", completed, () => smokeStep(manifest, deploymentUrl));

  const steps: InstallStepResult[] = [
    step("validate", "ok", "Manifiesto válido"),
    ...providerSteps,
    prepareRepo,
    supabaseProject,
    migrations,
    vercelProject,
    isolation,
    deployResult,
    domain,
    smoke,
    step(
      "register",
      manifest.dryRun || manifest.runMode !== "existing_resources"
        ? "simulated"
        : isPipelineExecutionComplete({
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
              isolation,
              deployResult,
              domain,
              smoke,
            ],
          })
          ? "ok"
          : "skipped",
      manifest.dryRun
        ? "Registro en Control (simulado)"
        : "Resultado final determinado en Control (preview_validated vs live)"
    ),
  ];

  const failed = steps.some((s) => s.status === "failed");
  const ok = !failed && (manifest.dryRun || isPipelineExecutionComplete({ ok: !failed, dryRun: manifest.dryRun, manifest, steps }));

  return { ok, dryRun: manifest.dryRun, manifest, steps, deploymentUrl };
}
