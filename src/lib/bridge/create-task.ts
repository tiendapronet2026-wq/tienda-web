import type { BridgeTaskRiskClass } from "@/lib/bridge/constants";
import {
  assertBridgeResourcesMatchProject,
  normalizeBridgeResources,
  resolveModeCApproval,
} from "@/lib/bridge/validate-resources";
import { appendBridgeTaskEvent, loadBridgeProjectBySlug, getBridgeAdminClient } from "@/lib/bridge/repository";

export async function createBridgeTaskRecord(input: {
  projectSlug: string;
  title: string;
  instruction: string;
  riskClass: BridgeTaskRiskClass;
  source: "control_ui" | "bridge_api" | "github";
  actor: string;
  resourcesOverride?: Partial<{
    github_repo: string;
    supabase_project_ref: string;
    vercel_project: string;
  }>;
}) {
  const project = await loadBridgeProjectBySlug(input.projectSlug);
  if (!project) {
    return { ok: false as const, error: "project_not_found" as const };
  }

  const resources = normalizeBridgeResources({
    github_repo: input.resourcesOverride?.github_repo ?? project.github_repo,
    supabase_project_ref:
      input.resourcesOverride?.supabase_project_ref ?? project.supabase_project_ref,
    vercel_project: input.resourcesOverride?.vercel_project ?? project.vercel_project ?? undefined,
  });

  const resourceErr = assertBridgeResourcesMatchProject(resources, project);
  if (resourceErr) {
    return { ok: false as const, error: resourceErr };
  }

  const mode = resolveModeCApproval({
    riskClass: input.riskClass,
    circuitValidated: project.circuit_validated,
  });

  const admin = getBridgeAdminClient();
  const { data, error } = await admin
    .from("bridge_tasks")
    .insert({
      project_id: project.id,
      title: input.title,
      instruction: input.instruction,
      risk_class: input.riskClass,
      status: mode.initialStatus,
      approval_required: mode.approvalRequired,
      owner_approved_at: mode.initialStatus === "approved" ? new Date().toISOString() : null,
      source: input.source,
      resources,
      created_by: input.source === "control_ui" ? input.actor : null,
    })
    .select("id, status, approval_required, resources, project_id")
    .single();

  if (error) {
    return { ok: false as const, error: error.message };
  }

  await appendBridgeTaskEvent({
    taskId: data.id,
    eventType: "task.created",
    summary: `Tarea creada vía ${input.source}`,
    payload: { riskClass: input.riskClass, status: data.status, resources },
    actor: input.actor,
  });

  return {
    ok: true as const,
    task: data,
    project: { id: project.id, slug: project.slug, display_name: project.display_name },
  };
}
