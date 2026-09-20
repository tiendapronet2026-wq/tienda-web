import { describe, expect, it } from "vitest";
import { assertAuthorizedTarget } from "@/lib/installer/providers/authorized";
import type { InstallationResourceGrant } from "@/lib/installer/grants";

const sampleGrant: InstallationResourceGrant = {
  id: "g1",
  installationId: "i1",
  environment: "preview",
  githubRepo: "tiendapronet2026-wq/tienda-web",
  vercelProject: "tienda-web",
  supabaseProjectRef: "dnptsudsxrcamtxfiszh",
  primaryDomain: null,
  deployBranch: "install/demo",
  scopes: ["verify"],
};

describe("installer authorized targets", () => {
  it("rechaza repo no autorizado sin grant", () => {
    expect(assertAuthorizedTarget("github", "other/repo")).toMatch(/no autorizado/i);
  });

  it("acepta recursos TiendaPro globales", () => {
    expect(assertAuthorizedTarget("github", "tiendapronet2026-wq/tienda-web")).toBeNull();
  });

  it("acepta recursos del grant de instalación", () => {
    expect(assertAuthorizedTarget("github", "tiendapronet2026-wq/tienda-web", sampleGrant)).toBeNull();
  });

  it("rechaza recurso distinto al grant", () => {
    expect(assertAuthorizedTarget("vercel", "otro-proyecto", sampleGrant)).toMatch(/no coincide/i);
  });
});
