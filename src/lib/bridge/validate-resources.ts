import {
  BRIDGE_AUTHORIZED_GITHUB_REPO,
  BRIDGE_AUTHORIZED_SUPABASE_REF,
  type BridgeTaskResources,
} from "@/lib/bridge/constants";

export function normalizeBridgeResources(input: Partial<BridgeTaskResources>): BridgeTaskResources {
  return {
    github_repo: String(input.github_repo ?? BRIDGE_AUTHORIZED_GITHUB_REPO).trim(),
    supabase_project_ref: String(input.supabase_project_ref ?? BRIDGE_AUTHORIZED_SUPABASE_REF).trim(),
    vercel_project: input.vercel_project?.trim() || null,
  };
}

export function assertBridgeResourcesMatchProject(
  resources: BridgeTaskResources,
  project: { github_repo: string; supabase_project_ref: string; vercel_project: string | null }
): string | null {
  if (resources.github_repo.toLowerCase() !== project.github_repo.toLowerCase()) {
    return "github_repo no coincide con el proyecto autorizado del puente.";
  }
  if (resources.supabase_project_ref.toLowerCase() !== project.supabase_project_ref.toLowerCase()) {
    return "supabase_project_ref no coincide con el proyecto autorizado del puente.";
  }
  if (
    project.vercel_project &&
    resources.vercel_project &&
    resources.vercel_project.toLowerCase() !== project.vercel_project.toLowerCase()
  ) {
    return "vercel_project no coincide con el proyecto piloto.";
  }
  if (resources.github_repo.toLowerCase() !== BRIDGE_AUTHORIZED_GITHUB_REPO.toLowerCase()) {
    return "Repositorio no autorizado: solo tiendapronet2026-wq/tienda-web.";
  }
  if (resources.supabase_project_ref.toLowerCase() !== BRIDGE_AUTHORIZED_SUPABASE_REF.toLowerCase()) {
    return "Proyecto Supabase no autorizado: solo dnptsudsxrcamtxfiszh.";
  }
  return null;
}

export function resolveModeCApproval(input: {
  riskClass: "minor" | "critical";
  circuitValidated: boolean;
}): { approvalRequired: boolean; initialStatus: "pending_approval" | "approved" } {
  if (input.riskClass === "critical") {
    return { approvalRequired: true, initialStatus: "pending_approval" };
  }
  if (input.circuitValidated) {
    return { approvalRequired: false, initialStatus: "approved" };
  }
  return { approvalRequired: true, initialStatus: "pending_approval" };
}
