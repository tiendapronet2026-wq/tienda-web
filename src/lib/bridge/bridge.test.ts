import { describe, expect, it } from "vitest";
import {
  assertBridgeResourcesMatchProject,
  resolveModeCApproval,
} from "@/lib/bridge/validate-resources";
import { verifyBridgeApiSecret } from "@/lib/bridge/api-auth";

describe("bridge validate-resources", () => {
  const project = {
    github_repo: "tiendapronet2026-wq/tienda-web",
    supabase_project_ref: "dnptsudsxrcamtxfiszh",
    vercel_project: "tienda-web",
  };

  it("rechaza repo no autorizado", () => {
    const err = assertBridgeResourcesMatchProject(
      { github_repo: "evil/other", supabase_project_ref: "dnptsudsxrcamtxfiszh" },
      project
    );
    expect(err).toContain("github_repo");
  });

  it("modo C auto-aprueba minor con circuito validado", () => {
    expect(resolveModeCApproval({ riskClass: "minor", circuitValidated: true })).toEqual({
      approvalRequired: false,
      initialStatus: "approved",
    });
    expect(resolveModeCApproval({ riskClass: "critical", circuitValidated: true }).initialStatus).toBe(
      "pending_approval"
    );
  });
});

describe("bridge api-auth", () => {
  it("verifyBridgeApiSecret respeta longitud", () => {
    process.env.BRIDGE_API_SECRET = "test-secret-bridge-api-key-32chars";
    expect(verifyBridgeApiSecret("test-secret-bridge-api-key-32chars")).toBe(true);
    expect(verifyBridgeApiSecret("wrong")).toBe(false);
    delete process.env.BRIDGE_API_SECRET;
  });
});
