type CheckScope = "activation" | "platform" | "policy" | "meta";

export type DiagnosticSectionId = "connection" | "security" | "tools" | "assistant" | "costs";

export const DIAGNOSTIC_SECTION_HEADINGS: Record<DiagnosticSectionId, string> = {
  connection: "Conexión",
  security: "Seguridad",
  tools: "Herramientas",
  assistant: "Asistente",
  costs: "Costos",
};

const SECTION_ORDER: DiagnosticSectionId[] = ["connection", "security", "tools", "assistant", "costs"];

export function diagnosticSectionForCheck(id: string, scope?: CheckScope): DiagnosticSectionId | null {
  if (id === "promotion_ready") return null;
  if (id === "project_registered" || id === "gateway" || id === "gateway_hmac") return "connection";
  if (id === "invalid_signature" || id === "cross_project") return "security";
  if (id.startsWith("casa_leon.")) return "tools";
  if (id === "assistant_registered" || id === "geli_transport") return "assistant";
  if (id === "cost_policy" || id === "evals") return "costs";
  if (scope === "policy") return "costs";
  if (scope === "platform") return "assistant";
  return "connection";
}

export { SECTION_ORDER };
