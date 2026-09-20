import { describe, expect, it } from "vitest";
import { assertBridgeResourcesMatchProject } from "@/lib/bridge/validate-resources";
import { verifyBridgeApiSecret } from "@/lib/bridge/api-auth";
import {
  canAcceptExternalResult,
  normalizeExternalRiskClass,
  resolveModeCApproval,
  sanitizeExternalBridgeResult,
} from "@/lib/bridge/register-result";

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
});

describe("bridge resolveModeCApproval", () => {
  it("modo C auto-aprueba minor solo desde control_ui con circuito validado", () => {
    expect(
      resolveModeCApproval({ riskClass: "minor", circuitValidated: true, source: "control_ui" })
    ).toEqual({
      approvalRequired: false,
      initialStatus: "approved",
    });
    expect(
      resolveModeCApproval({ riskClass: "minor", circuitValidated: false, source: "control_ui" })
        .initialStatus
    ).toBe("pending_approval");
    expect(
      resolveModeCApproval({ riskClass: "critical", circuitValidated: true, source: "control_ui" })
        .initialStatus
    ).toBe("pending_approval");
  });

  it("API bridge y GitHub nunca auto-aprueban aunque digan minor y circuito validado", () => {
    for (const source of ["bridge_api", "github"] as const) {
      expect(
        resolveModeCApproval({ riskClass: "minor", circuitValidated: true, source })
      ).toEqual({
        approvalRequired: true,
        initialStatus: "pending_approval",
      });
    }
  });
});

describe("bridge external risk and results", () => {
  it("normalizeExternalRiskClass fuerza critical vía bridge_api", () => {
    expect(normalizeExternalRiskClass("minor", "bridge_api")).toBe("critical");
    expect(normalizeExternalRiskClass("minor", "github")).toBe("minor");
  });

  it("sanitizeExternalBridgeResult bloquea campos de aprobación y no verifica tests", () => {
    const blocked = sanitizeExternalBridgeResult({
      summary: "Hecho",
      owner_approved: true,
      tests: [{ name: "e2e", status: "pass" }],
    });
    expect(blocked.ok).toBe(false);

    const ok = sanitizeExternalBridgeResult({
      summary: "Claim externo",
      tests: [{ name: "e2e", status: "pass" }],
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.report.trustLevel).toBe("external_unverified");
      expect(ok.report.testsVerified).toBe(false);
      expect(ok.report.tests[0]?.status).toBe("skipped");
      expect(ok.report.tests[0]?.claimed).toBe("pass");
    }
  });

  it("canAcceptExternalResult exige dispatched o running", () => {
    expect(canAcceptExternalResult("pending_approval")).toBe(false);
    expect(canAcceptExternalResult("approved")).toBe(false);
    expect(canAcceptExternalResult("dispatched")).toBe(true);
    expect(canAcceptExternalResult("running")).toBe(true);
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

describe("bridge repository API vs panel (sin cookies)", () => {
  it("loadBridgeTasksForBridgeApi y ForPanel son funciones distintas (service_role vs sesión)", async () => {
    const repo = await import("@/lib/bridge/repository");
    expect(repo.loadBridgeTasksForBridgeApi).not.toBe(repo.loadBridgeTasksForPanel);
    expect(repo.loadBridgeTaskByIdForBridgeApi).not.toBe(repo.loadBridgeTaskByIdForPanel);
  });
});
