import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isTiendaProSupabaseConfigured } from "@/lib/platform/tenant-loader";
import type {
  BridgeTaskResultReport,
  BridgeTaskRiskClass,
  BridgeTaskStatus,
} from "@/lib/bridge/constants";
import type { BridgeTaskResources } from "@/lib/bridge/constants";

export type BridgeProjectRow = {
  id: string;
  slug: string;
  display_name: string;
  github_repo: string;
  supabase_project_ref: string;
  vercel_project: string | null;
  circuit_validated: boolean;
};

export type BridgeTaskRow = {
  id: string;
  project_id: string;
  title: string;
  instruction: string;
  risk_class: BridgeTaskRiskClass;
  status: BridgeTaskStatus;
  approval_required: boolean;
  owner_approved_at: string | null;
  source: string;
  resources: BridgeTaskResources;
  executor: string;
  external_ref: string | null;
  result_report: BridgeTaskResultReport;
  created_at: string;
  updated_at: string;
  bridge_projects?: { slug: string; display_name: string } | null;
};

export type BridgeTaskEventRow = {
  id: string;
  task_id: string;
  event_type: string;
  summary: string;
  payload: Record<string, unknown>;
  actor: string;
  created_at: string;
};

function getBridgeAdminClient() {
  if (!isTiendaProSupabaseConfigured()) {
    throw new Error("Supabase plataforma no configurado");
  }
  return createAdminClient();
}

export async function loadBridgeProjects(): Promise<BridgeProjectRow[]> {
  if (!isTiendaProSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bridge_projects")
    .select("id, slug, display_name, github_repo, supabase_project_ref, vercel_project, circuit_validated")
    .eq("active", true)
    .order("slug");
  if (error) throw new Error(error.message);
  return (data ?? []) as BridgeProjectRow[];
}

export async function loadBridgeProjectBySlug(slug: string): Promise<BridgeProjectRow | null> {
  if (!isTiendaProSupabaseConfigured()) return null;
  const admin = getBridgeAdminClient();
  const { data } = await admin
    .from("bridge_projects")
    .select("id, slug, display_name, github_repo, supabase_project_ref, vercel_project, circuit_validated")
    .eq("slug", slug)
    .maybeSingle();
  return (data as BridgeProjectRow) ?? null;
}

export async function loadBridgeTasks(limit = 50): Promise<BridgeTaskRow[]> {
  if (!isTiendaProSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bridge_tasks")
    .select(
      "id, project_id, title, instruction, risk_class, status, approval_required, owner_approved_at, source, resources, executor, external_ref, result_report, created_at, updated_at, bridge_projects(slug, display_name)"
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as BridgeTaskRow[];
}

export async function loadBridgeTaskById(id: string): Promise<{
  task: BridgeTaskRow | null;
  events: BridgeTaskEventRow[];
}> {
  if (!isTiendaProSupabaseConfigured()) {
    return { task: null, events: [] };
  }
  const supabase = await createClient();
  const [{ data: task, error: tErr }, { data: events, error: eErr }] = await Promise.all([
    supabase
      .from("bridge_tasks")
      .select(
        "id, project_id, title, instruction, risk_class, status, approval_required, owner_approved_at, source, resources, executor, external_ref, result_report, created_at, updated_at, bridge_projects(slug, display_name)"
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("bridge_task_events")
      .select("id, task_id, event_type, summary, payload, actor, created_at")
      .eq("task_id", id)
      .order("created_at", { ascending: true }),
  ]);
  if (tErr) throw new Error(tErr.message);
  if (eErr) throw new Error(eErr.message);
  return { task: (task as unknown as BridgeTaskRow) ?? null, events: (events ?? []) as BridgeTaskEventRow[] };
}

export async function appendBridgeTaskEvent(input: {
  taskId: string;
  eventType: string;
  summary: string;
  payload?: Record<string, unknown>;
  actor: string;
}) {
  const admin = getBridgeAdminClient();
  const { error } = await admin.from("bridge_task_events").insert({
    task_id: input.taskId,
    event_type: input.eventType,
    summary: input.summary,
    payload: input.payload ?? {},
    actor: input.actor,
  });
  if (error) throw new Error(error.message);
}

export async function updateBridgeTask(
  taskId: string,
  patch: Record<string, unknown>,
  event?: { eventType: string; summary: string; payload?: Record<string, unknown>; actor: string }
) {
  const admin = getBridgeAdminClient();
  const { error } = await admin
    .from("bridge_tasks")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", taskId);
  if (error) throw new Error(error.message);
  if (event) {
    await appendBridgeTaskEvent({ taskId, ...event });
  }
}

export { getBridgeAdminClient };
