import type { AuditEntry } from "@/lib/agents/types";

/** Informes entrantes desde agentes — sin ejecución arbitraria. */
export type AgentReportIntake = {
  reportId: string;
  agentName: string;
  summary: string;
  createdAt: string;
  requiresApproval: boolean;
};

export type AgentTaskIntake = {
  taskId: string;
  title: string;
  suggestedAction: string;
  /** Nunca ejecutar directo; encolar para operador con permiso. */
  autoExecute: false;
};

export type AgentOperationsContract = {
  submitReport(report: Omit<AgentReportIntake, "reportId">): Promise<AgentReportIntake>;
  submitTask(task: Omit<AgentTaskIntake, "taskId">): Promise<AgentTaskIntake>;
  listAudit(): readonly AuditEntry[];
};
