import { describe, expect, it } from "vitest";
import { detectResourceTier, manifestMatchesGrant, type InstallationResourceGrant } from "@/lib/installer/grants";
import { classifyInstallationOutcome } from "@/lib/installer/outcome";
import type { InstallRunResult } from "@/lib/installer/manifest";
import { TIENDAPRO_AUTHORIZED_LINK_TARGETS } from "@/lib/installer/providers/authorized";

describe("grant form / instalador (funcional sin TiendaPro como independiente)", () => {
  it("detecta platform_test cuando los tres IDs son infra TiendaPro", () => {
    const tier = detectResourceTier(
      TIENDAPRO_AUTHORIZED_LINK_TARGETS.githubRepo,
      TIENDAPRO_AUTHORIZED_LINK_TARGETS.vercelProject,
      TIENDAPRO_AUTHORIZED_LINK_TARGETS.supabaseProjectRef
    );
    expect(tier).toBe("platform_test");
  });

  it("rechaza manifiesto con repo distinto al grant (otra empresa)", () => {
    const grant: InstallationResourceGrant = {
      id: "g1",
      installationId: "i1",
      environment: "preview",
      githubRepo: "cliente-a/tienda",
      vercelProject: "tienda-a",
      supabaseProjectRef: "aaaaaaaaaaaaaaaa",
      primaryDomain: null,
      deployBranch: "install/a",
      scopes: ["verify"],
      resourceTier: "client_owned",
    };
    const errors = manifestMatchesGrant(
      {
        primaryDomain: null,
        providers: {
          github: { repo: "cliente-b/tienda" },
          vercel: { project: "tienda-a" },
          supabase: { projectRef: "aaaaaaaaaaaaaaaa" },
        },
      },
      grant
    );
    expect(errors.length).toBeGreaterThan(0);
  });

  it("pipeline OK en stack TiendaPro no produce live independiente", () => {
    const grant: InstallationResourceGrant = {
      id: "g1",
      installationId: "i1",
      environment: "preview",
      githubRepo: TIENDAPRO_AUTHORIZED_LINK_TARGETS.githubRepo,
      vercelProject: TIENDAPRO_AUTHORIZED_LINK_TARGETS.vercelProject,
      supabaseProjectRef: TIENDAPRO_AUTHORIZED_LINK_TARGETS.supabaseProjectRef,
      primaryDomain: null,
      deployBranch: "install/demo",
      scopes: ["verify"],
      resourceTier: "platform_test",
    };
    const steps = [
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

    const result: InstallRunResult = {
      ok: true,
      dryRun: false,
      manifest: {
        version: "1",
        companyName: "Demo",
        companySlug: "demo",
        templateId: "ecommerce-store-v1",
        primaryDomain: null,
        enabledModules: ["venta-online"],
        branding: {},
        runMode: "existing_resources",
        installEnvironment: "preview",
        providers: {
          github: { connected: true, simulated: false, repo: grant.githubRepo },
          vercel: { connected: true, simulated: false, project: grant.vercelProject },
          supabase: { connected: true, simulated: false, projectRef: grant.supabaseProjectRef },
        },
        dryRun: false,
      },
      steps,
    };

    const outcome = classifyInstallationOutcome(result, grant);
    expect(outcome.lifecycleStatus).toBe("preview_validated");
    expect(outcome.isIndependentLive).toBe(false);
  });
});
