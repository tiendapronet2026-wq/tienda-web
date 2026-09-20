import { describe, expect, it } from "vitest";
import { classifyInstallationOutcome, grantUsesPlatformTiendaProStack } from "@/lib/installer/outcome";
import type { InstallationResourceGrant } from "@/lib/installer/grants";
import type { InstallRunResult } from "@/lib/installer/manifest";

const baseGrant: InstallationResourceGrant = {
  id: "1",
  installationId: "i1",
  environment: "preview",
  githubRepo: "cliente-org/tienda-acme",
  vercelProject: "tienda-acme",
  supabaseProjectRef: "abcdefghijklmnop",
  primaryDomain: null,
  deployBranch: "install/acme",
  scopes: ["verify"],
  resourceTier: "client_owned",
};

function okResult(steps: InstallRunResult["steps"]): InstallRunResult {
  return {
    ok: true,
    dryRun: false,
    deploymentUrl: "https://preview.example",
    manifest: {
      version: "1",
      companyName: "Acme",
      companySlug: "acme",
      templateId: "ecommerce-store-v1",
      primaryDomain: null,
      enabledModules: ["venta-online"],
      branding: {},
      runMode: "existing_resources",
      installEnvironment: "preview",
      providers: {
        github: { connected: true, simulated: false, repo: "cliente-org/tienda-acme" },
        vercel: { connected: true, simulated: false, project: "tienda-acme" },
        supabase: { connected: true, simulated: false, projectRef: "abcdefghijklmnop" },
      },
      dryRun: false,
    },
    steps,
  };
}

const okSteps = [
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
].map((step) => ({ step, status: "ok" as const, message: "ok" }));

describe("installation outcome", () => {
  it("stack TiendaPro → preview_validated, no live", () => {
    const grant: InstallationResourceGrant = {
      ...baseGrant,
      githubRepo: "tiendapronet2026-wq/tienda-web",
      vercelProject: "tienda-web",
      supabaseProjectRef: "dnptsudsxrcamtxfiszh",
      resourceTier: "platform_test",
    };
    expect(grantUsesPlatformTiendaProStack(grant)).toBe(true);
    const outcome = classifyInstallationOutcome(okResult(okSteps), grant);
    expect(outcome.lifecycleStatus).toBe("preview_validated");
    expect(outcome.isIndependentLive).toBe(false);
  });

  it("recursos cliente → live independiente", () => {
    const outcome = classifyInstallationOutcome(okResult(okSteps), baseGrant);
    expect(outcome.lifecycleStatus).toBe("live");
    expect(outcome.isIndependentLive).toBe(true);
  });
});
