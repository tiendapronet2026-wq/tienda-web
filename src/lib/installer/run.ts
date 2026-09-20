import type { InstallationManifest, InstallRunResult, InstallStepResult } from "@/lib/installer/manifest";
import { validateManifest } from "@/lib/installer/manifest";
import { verifyGithubRepoAccess } from "@/lib/installer/providers/github";
import { verifyVercelProjectAccess } from "@/lib/installer/providers/vercel";
import { verifySupabaseProjectAccess } from "@/lib/installer/providers/supabase";

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

/** Verifica acceso real a proveedores (tokens solo servidor). */
export async function verifyProviderPermissions(manifest: InstallationManifest): Promise<InstallStepResult[]> {
  const results: InstallStepResult[] = [];
  const { github, vercel, supabase } = manifest.providers;

  const entries = [
    {
      verify: async () => {
        if (manifest.dryRun || github.simulated) {
          return step("providers.github.permissions", "simulated", "Permisos github simulados OK");
        }
        if (!github.connected) {
          return step("providers.github.permissions", "skipped", "github no vinculado — completá verificación");
        }
        const r = await verifyGithubRepoAccess(github.repo);
        return step("providers.github.permissions", r.status === "ok" ? "ok" : r.status, r.message);
      },
    },
    {
      verify: async () => {
        if (manifest.dryRun || vercel.simulated) {
          return step("providers.vercel.permissions", "simulated", "Permisos vercel simulados OK");
        }
        if (!vercel.connected) {
          return step("providers.vercel.permissions", "skipped", "vercel no vinculado — completá verificación");
        }
        const r = await verifyVercelProjectAccess(vercel.project);
        return step("providers.vercel.permissions", r.status === "ok" ? "ok" : r.status, r.message);
      },
    },
    {
      verify: async () => {
        if (manifest.dryRun || supabase.simulated) {
          return step("providers.supabase.permissions", "simulated", "Permisos supabase simulados OK");
        }
        if (!supabase.connected) {
          return step("providers.supabase.permissions", "skipped", "supabase no vinculado — completá verificación");
        }
        const r = await verifySupabaseProjectAccess(supabase.projectRef);
        return step("providers.supabase.permissions", r.status === "ok" ? "ok" : r.status, r.message);
      },
    },
  ];

  for (const entry of entries) {
    results.push(await entry.verify());
  }

  return results;
}

export function prepareRepositoryFromTemplate(manifest: InstallationManifest): InstallStepResult {
  if (manifest.dryRun) {
    return step(
      "github.prepare_repo",
      "simulated",
      `Clonar plantilla ${manifest.templateId} → ${manifest.providers.github.repo ?? "repo/nuevo"} (simulado)`
    );
  }
  if (!provisioningEnabled()) {
    return step(
      "github.prepare_repo",
      "skipped",
      "Provisionamiento repo deshabilitado (requiere INSTALLER_ALLOW_PROVISION=1)"
    );
  }
  return step("github.prepare_repo", "skipped", "Provisionamiento repo pendiente de implementación");
}

export function configureIsolatedSupabase(manifest: InstallationManifest): InstallStepResult {
  if (manifest.dryRun) {
    return step(
      "supabase.project",
      "simulated",
      `Proyecto aislado ${manifest.providers.supabase.projectRef ?? "nuevo-ref"} + migraciones versionadas (simulado)`
    );
  }
  if (!provisioningEnabled()) {
    return step("supabase.project", "skipped", "Creación Supabase real no autorizada");
  }
  return step("supabase.project", "skipped", "Creación Supabase pendiente de implementación");
}

export function configureVercelProject(manifest: InstallationManifest): InstallStepResult {
  if (manifest.dryRun) {
    return step(
      "vercel.project",
      "simulated",
      `Proyecto Vercel ${manifest.providers.vercel.project ?? "nuevo"} + env seguras (simulado)`
    );
  }
  if (!provisioningEnabled()) {
    return step("vercel.project", "skipped", "Creación Vercel real no autorizada");
  }
  return step("vercel.project", "skipped", "Creación Vercel pendiente de implementación");
}

export function applyMigrationsDryRun(manifest: InstallationManifest): InstallStepResult {
  if (manifest.dryRun) {
    return step(
      "supabase.migrations",
      "simulated",
      `Migraciones módulos: ${manifest.enabledModules.join(", ")}`
    );
  }
  if (!provisioningEnabled()) {
    return step("supabase.migrations", "skipped", "Migraciones cloud no ejecutadas sin autorización");
  }
  return step("supabase.migrations", "skipped", "Aplicación de migraciones pendiente de implementación");
}

export function runSmokeTests(manifest: InstallationManifest): InstallStepResult {
  if (manifest.dryRun) {
    return step("smoke_tests", "simulated", "Health /login, catálogo, checkout flag (simulado)");
  }
  if (!provisioningEnabled()) {
    return step("smoke_tests", "skipped", "Smoke tests post-deploy no ejecutados");
  }
  return step("smoke_tests", "skipped", "Smoke tests pendiente de implementación");
}

export async function runInstallationPipeline(manifest: InstallationManifest): Promise<InstallRunResult> {
  const errors = validateManifest(manifest);
  if (errors.length) {
    return {
      ok: false,
      dryRun: manifest.dryRun,
      manifest,
      steps: [step("validate", "failed", errors.join(" "))],
    };
  }

  const providerSteps = await verifyProviderPermissions(manifest);

  const steps: InstallStepResult[] = [
    step("validate", "ok", "Manifiesto válido"),
    ...providerSteps,
    prepareRepositoryFromTemplate(manifest),
    configureIsolatedSupabase(manifest),
    applyMigrationsDryRun(manifest),
    configureVercelProject(manifest),
    step(
      "domain.bind",
      manifest.dryRun ? "simulated" : provisioningEnabled() ? "skipped" : "skipped",
      manifest.primaryDomain
        ? manifest.dryRun
          ? `Dominio ${manifest.primaryDomain} (simulado)`
          : `Dominio ${manifest.primaryDomain} — DNS no modificado sin autorización`
        : "Sin dominio custom"
    ),
    step(
      "deploy",
      manifest.dryRun ? "simulated" : "skipped",
      manifest.dryRun
        ? "Deploy producción (simulado)"
        : provisioningEnabled()
          ? "Deploy pendiente de implementación"
          : "Deploy no autorizado (INSTALLER_ALLOW_PROVISION=1)"
    ),
    runSmokeTests(manifest),
    step(
      "register",
      manifest.dryRun ? "simulated" : "skipped",
      manifest.dryRun ? "Registro en Control (simulado)" : "Registro post-deploy pendiente"
    ),
  ];

  const failed = steps.some((s) => s.status === "failed");
  const ok = !failed && (manifest.dryRun || !steps.some((s) => s.status === "failed"));
  return { ok, dryRun: manifest.dryRun, manifest, steps };
}
