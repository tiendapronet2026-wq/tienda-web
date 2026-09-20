import { describe, expect, it } from "vitest";
import { buildManifestFromWizardPayload, slugifyCompanyName, validateManifest } from "@/lib/installer/manifest";
import { runInstallationPipeline } from "@/lib/installer/run";

describe("installation manifest", () => {
  it("slugify normaliza nombre", () => {
    expect(slugifyCompanyName("Acme Café SA")).toBe("acme-cafe-sa");
  });

  it("valida campos mínimos", () => {
    expect(
      validateManifest({
        companyName: "Acme",
        templateId: "ecommerce-store-v1",
        enabledModules: ["venta-online"],
      })
    ).toEqual([]);
  });

  it("dry-run pipeline completo simulado", async () => {
    const manifest = buildManifestFromWizardPayload(
      {
        companyName: "Empresa Demo Ficticia",
        templateId: "ecommerce-store-v1",
        modules: ["venta-online", "stock"],
        primaryDomain: "demo.cliente.test",
        githubSimulated: true,
        vercelSimulated: true,
        supabaseSimulated: true,
      },
      { dryRun: true }
    );
    const result = await runInstallationPipeline(manifest);
    expect(result.ok).toBe(true);
    expect(result.dryRun).toBe(true);
    expect(result.steps.some((s) => s.step === "deploy" && s.status === "simulated")).toBe(true);
  });
});
