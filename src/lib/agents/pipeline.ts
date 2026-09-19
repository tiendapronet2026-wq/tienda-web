import type { AgentIntent, AuditEntry, RuleDecision, ToolExecutionResult, ValidationResult } from "./types";

const auditLog: AuditEntry[] = [];

function audit(partial: Omit<AuditEntry, "id" | "timestamp">): AuditEntry {
  const entry: AuditEntry = {
    id: `aud-${auditLog.length + 1}`,
    timestamp: new Date().toISOString(),
    ...partial,
  };
  auditLog.push(entry);
  return entry;
}

/** Capa 1 — interpretación (mock: mapeo simple, no LLM en producción). */
export function interpretUserMessage(message: string): AgentIntent {
  const lower = message.toLowerCase();
  if (lower.includes("informe")) {
    return { action: "generate_report", payload: { topic: message }, confidence: 0.9 };
  }
  if (lower.includes("cliente")) {
    return { action: "list_clients", payload: {}, confidence: 0.85 };
  }
  return { action: "help", payload: { message }, confidence: 0.7 };
}

/** Capa 2 — validación de permisos (mock tenant). */
export function validateIntent(_intent: AgentIntent, role: "demo" | "admin" = "demo"): ValidationResult {
  if (role === "demo") {
    return { ok: true };
  }
  return { ok: false, reason: "Rol no autorizado en demo." };
}

/** Capa 3 — motor de reglas. */
export function applyRules(intent: AgentIntent): RuleDecision {
  switch (intent.action) {
    case "generate_report":
      return { allowed: true, tool: "report_draft", message: "Se permite borrador de informe en demo." };
    case "list_clients":
      return { allowed: true, tool: "mock_clients", message: "Listado mock permitido." };
    default:
      return { allowed: true, message: "Mostrar ayuda general." };
  }
}

/** Capa 4 — herramientas autorizadas (mock). */
export function runAuthorizedTool(decision: RuleDecision): ToolExecutionResult {
  if (!decision.allowed) {
    const entry = audit({
      intent: "denied",
      decision: decision.message,
      outcome: "blocked",
    });
    return { success: false, output: decision.message, auditId: entry.id };
  }

  let output = "Comandos demo: informe, clientes, ayuda.";
  if (decision.tool === "report_draft") {
    output = "Borrador: TiendaPro 3.0 — datos ficticios, sin despliegue.";
  }
  if (decision.tool === "mock_clients") {
    output = "Clientes demo: Nova Retail, Atlas Servicios, Horizonte Labs.";
  }

  const entry = audit({
    intent: decision.tool ?? "help",
    decision: decision.message,
    tool: decision.tool,
    outcome: "ok",
  });

  return { success: true, output, auditId: entry.id };
}

export function getAuditTrail(): readonly AuditEntry[] {
  return auditLog;
}

/** Pipeline completo para UI demo. */
export function runAgentPipeline(message: string): { reply: string; auditId: string } {
  const intent = interpretUserMessage(message);
  const validation = validateIntent(intent);
  if (!validation.ok) {
    const r = runAuthorizedTool({ allowed: false, message: validation.reason });
    return { reply: r.output, auditId: r.auditId };
  }
  const decision = applyRules(intent);
  const result = runAuthorizedTool(decision);
  return { reply: result.output, auditId: result.auditId };
}
