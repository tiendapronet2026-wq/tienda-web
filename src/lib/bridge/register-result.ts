import type { BridgeTaskResultReport } from "@/lib/bridge/constants";
import type { BridgeTaskStatus } from "@/lib/bridge/constants";

const BLOCKED_RESULT_KEYS = [
  "owner_approved",
  "owner_approved_at",
  "approval_granted",
  "status",
  "tests_verified",
] as const;

export function resolveModeCApproval(input: {
  riskClass: "minor" | "critical";
  circuitValidated: boolean;
  /** Entradas externas nunca auto-aprueban por risk_class declarado. */
  source: "control_ui" | "bridge_api" | "github";
}): { approvalRequired: boolean; initialStatus: "pending_approval" | "approved" } {
  if (input.source === "bridge_api" || input.source === "github") {
    return { approvalRequired: true, initialStatus: "pending_approval" };
  }

  if (input.riskClass === "critical") {
    return { approvalRequired: true, initialStatus: "pending_approval" };
  }

  if (input.circuitValidated) {
    return { approvalRequired: false, initialStatus: "approved" };
  }

  return { approvalRequired: true, initialStatus: "pending_approval" };
}

export function normalizeExternalRiskClass(
  raw: unknown,
  source: "bridge_api" | "github"
): "minor" | "critical" {
  if (source === "bridge_api") {
    return "critical";
  }
  return raw === "minor" ? "minor" : "critical";
}

export function sanitizeExternalBridgeResult(
  body: Record<string, unknown>
): { ok: true; report: BridgeTaskResultReport } | { ok: false; error: string } {
  for (const key of BLOCKED_RESULT_KEYS) {
    if (key in body && body[key] != null) {
      return { ok: false, error: `Campo prohibido en resultado externo: ${key}` };
    }
  }

  const rawTests = Array.isArray(body.tests) ? body.tests : [];
  const tests = rawTests.map((t) => {
    const row = t as Record<string, unknown>;
    const rawStatus = row.status;
    const claimed: "pass" | "fail" | "unknown" =
      rawStatus === "pass" ? "pass" : rawStatus === "fail" ? "fail" : "unknown";
    return {
      name: String(row.name ?? "test"),
      status: "skipped" as const,
      claimed,
    };
  });

  const report: BridgeTaskResultReport = {
    summary: String(body.summary ?? "Resultado externo (no verificado en servidor)"),
    filesChanged: Array.isArray(body.files_changed)
      ? body.files_changed.map(String)
      : Array.isArray(body.filesChanged)
        ? body.filesChanged.map(String)
        : [],
    tests,
    prUrl: body.pr_url ? String(body.pr_url) : body.prUrl ? String(body.prUrl) : null,
    deployUrl: body.deploy_url ? String(body.deploy_url) : body.deployUrl ? String(body.deployUrl) : null,
    errors: Array.isArray(body.errors) ? body.errors.map(String) : [],
    nextAction: body.next_action ? String(body.next_action) : body.nextAction ? String(body.nextAction) : null,
    simulated: Boolean(body.simulated),
    trustLevel: "external_unverified",
    testsVerified: false,
  };

  return { ok: true, report };
}

export function resultStatusFromReport(report: BridgeTaskResultReport): BridgeTaskStatus {
  if (report.errors?.length) return "failed";
  return "completed";
}

export function canAcceptExternalResult(taskStatus: string): boolean {
  return taskStatus === "dispatched" || taskStatus === "running";
}
