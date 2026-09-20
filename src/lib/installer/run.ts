import type { InstallationManifest, InstallRunResult, InstallStepResult } from "@/lib/installer/manifest";
import { validateManifest } from "@/lib/installer/manifest";

function step(
  stepName: string,
  status: InstallStepResult["status"],
  message: string
): InstallStepResult {
  return { step: stepName, status, message };
}

/** Verifica permisos declarados (simulado: no llama APIs externas). */
export function verifyProviderPermissions(manifest: InstallationManifest): InstallStepResult[] {
  const results: InstallStepResult[] = [];
  for (const [name, cfg] of Object.entries(manifest.providers)) {
    if (manifest.dryRun || cfg.simulated) {
      results.push(step(`providers.${name}.permissions`, "simulated", `Permisos ${name} simulados OK`));
      continue;
    }
    if (!cfg.connected) {
      results.push(step(`providers.${name}.permissions`, "skipped", `${name} no vinculado`));
      continue;
    }
    results.push(step(`providers.${name}.permissions`, "ok", `Permisos ${name} declarados`));
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
  return step("github.prepare_repo", "skipped", "Provisionamiento real deshabilitado sin autorización explícita");
}

export function configureIsolatedSupabase(manifest: InstallationManifest): InstallStepResult {
  if (manifest.dryRun) {
    return step(
      "supabase.project",
      "simulated",
      `Proyecto aislado ${manifest.providers.supabase.projectRef ?? "nuevo-ref"} + migraciones versionadas (simulado)`
    );
  }
  return step("supabase.project", "skipped", "Creación Supabase real no ejecutada");
}

export function configureVercelProject(manifest: InstallationManifest): InstallStepResult {
  if (manifest.dryRun) {
    return step(
      "vercel.project",
      "simulated",
      `Proyecto Vercel ${manifest.providers.vercel.project ?? "nuevo"} + env seguras (simulado)`
    );
  }
  return step("vercel.project", "skipped", "Creación Vercel real no ejecutada");
}

export function applyMigrationsDryRun(manifest: InstallationManifest): InstallStepResult {
  return step(
    "supabase.migrations",
    manifest.dryRun ? "simulated" : "skipped",
    `Migraciones módulos: ${manifest.enabledModules.join(", ")}`
  );
}

export function runSmokeTests(manifest: InstallationManifest): InstallStepResult {
  return step(
    "smoke_tests",
    manifest.dryRun ? "simulated" : "skipped",
    "Health /login, catálogo, checkout flag (simulado)"
  );
}

export function runInstallationPipeline(manifest: InstallationManifest): InstallRunResult {
  const errors = validateManifest(manifest);
  if (errors.length) {
    return {
      ok: false,
      dryRun: manifest.dryRun,
      manifest,
      steps: [step("validate", "failed", errors.join(" "))],
    };
  }

  const steps: InstallStepResult[] = [
    step("validate", "ok", "Manifiesto válido"),
    ...verifyProviderPermissions(manifest),
    prepareRepositoryFromTemplate(manifest),
    configureIsolatedSupabase(manifest),
    applyMigrationsDryRun(manifest),
    configureVercelProject(manifest),
    step(
      "domain.bind",
      manifest.dryRun ? "simulated" : "skipped",
      manifest.primaryDomain ? `Dominio ${manifest.primaryDomain}` : "Sin dominio custom"
    ),
    step("deploy", manifest.dryRun ? "simulated" : "skipped", "Deploy producción"),
    runSmokeTests(manifest),
    step("register", manifest.dryRun ? "simulated" : "skipped", "Registrar instalación en Control"),
  ];

  const failed = steps.some((s) => s.status === "failed");
  return { ok: !failed, dryRun: manifest.dryRun, manifest, steps };
}
