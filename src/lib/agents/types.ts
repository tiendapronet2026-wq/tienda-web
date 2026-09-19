/** Centro de agentes — tipos sin integraciones externas activas. */

export type AgentIntent = {
  action: string;
  payload: Record<string, unknown>;
  confidence: number;
};

export type ValidationResult =
  | { ok: true }
  | { ok: false; reason: string };

export type RuleDecision = {
  allowed: boolean;
  tool?: string;
  message: string;
};

export type ToolExecutionResult = {
  success: boolean;
  output: string;
  auditId: string;
};

export type AuditEntry = {
  id: string;
  timestamp: string;
  intent: string;
  decision: string;
  tool?: string;
  outcome: string;
};
