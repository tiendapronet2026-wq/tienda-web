import type { InstallationManifest } from "@/lib/installer/manifest";

/** Adaptador GitHub — solo dry-run / verificación declarativa. */
export function githubAdapterDryRun(manifest: InstallationManifest) {
  return {
    provider: "github" as const,
    action: manifest.dryRun ? "simulate_clone_template" : "blocked",
    repo: manifest.providers.github.repo ?? `cliente/${manifest.companySlug}`,
  };
}

/** Adaptador Vercel — sin tokens en repo. */
export function vercelAdapterDryRun(manifest: InstallationManifest) {
  return {
    provider: "vercel" as const,
    action: manifest.dryRun ? "simulate_create_project" : "blocked",
    project: manifest.providers.vercel.project ?? manifest.companySlug,
  };
}

/** Adaptador Supabase — proyecto aislado por instalación. */
export function supabaseAdapterDryRun(manifest: InstallationManifest) {
  return {
    provider: "supabase" as const,
    action: manifest.dryRun ? "simulate_create_project" : "blocked",
    projectRef: manifest.providers.supabase.projectRef ?? "new-isolated-ref",
  };
}
