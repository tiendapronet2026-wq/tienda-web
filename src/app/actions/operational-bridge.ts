"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireControlOwner } from "@/lib/platform/control-owner-guard";
import { isTiendaProSupabaseConfigured } from "@/lib/platform/tenant-loader";
import { BRIDGE_PILOT_PROJECT_SLUG } from "@/lib/bridge/constants";
import { createBridgeTaskRecord } from "@/lib/bridge/create-task";
import {
  loadBridgeProjectBySlug,
  loadBridgeTaskById,
  updateBridgeTask,
} from "@/lib/bridge/repository";
import { buildSimulatedCursorResult, dispatchBridgeTaskViaGitHubIssue } from "@/lib/bridge/transports";
import type { BridgeTaskResultReport } from "@/lib/bridge/constants";

export async function createOperationalTask(formData: FormData) {
  if (!isTiendaProSupabaseConfigured()) {
    return { ok: false, error: "Plataforma no configurada" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión requerida" };

  const project = await loadBridgeProjectBySlug(
    String(formData.get("project_slug") ?? BRIDGE_PILOT_PROJECT_SLUG)
  );
  if (!project) return { ok: false, error: "Proyecto piloto no encontrado" };

  const title = String(formData.get("title") ?? "").trim();
  const instruction = String(formData.get("instruction") ?? "").trim();
  const riskClass = String(formData.get("risk_class") ?? "minor") as "minor" | "critical";
  if (!title || !instruction) return { ok: false, error: "Título e instrucción requeridos" };

  const created = await createBridgeTaskRecord({
    projectSlug: String(formData.get("project_slug") ?? BRIDGE_PILOT_PROJECT_SLUG),
    title,
    instruction,
    riskClass,
    source: "control_ui",
    actor: user.id,
    resourcesOverride: {
      github_repo: String(formData.get("github_repo") ?? project.github_repo),
      supabase_project_ref: String(formData.get("supabase_ref") ?? project.supabase_project_ref),
      vercel_project: String(formData.get("vercel_project") ?? project.vercel_project ?? ""),
    },
  });

  if (!created.ok) return { ok: false, error: created.error };

  revalidatePath("/control/tareas");
  return { ok: true, taskId: created.task.id };
}

export async function approveOperationalTask(taskId: string) {
  const gate = await requireControlOwner();
  if (!gate.ok) return { ok: false, error: gate.error };

  const { task } = await loadBridgeTaskById(taskId);
  if (!task) return { ok: false, error: "Tarea no encontrada" };
  if (task.status !== "pending_approval") {
    return { ok: false, error: "La tarea no está pendiente de aprobación" };
  }

  await updateBridgeTask(
    taskId,
    {
      status: "approved",
      owner_approved_at: new Date().toISOString(),
      owner_approved_by: gate.userId,
    },
    {
      eventType: "task.approved",
      summary: "Aprobada por propietario Control",
      actor: gate.userId,
    }
  );

  revalidatePath("/control/tareas");
  revalidatePath(`/control/tareas/${taskId}`);
  return { ok: true };
}

export async function dispatchOperationalTask(taskId: string) {
  const gate = await requireControlOwner();
  if (!gate.ok) return { ok: false, error: gate.error };

  const { task } = await loadBridgeTaskById(taskId);
  if (!task) return { ok: false, error: "Tarea no encontrada" };
  if (task.status !== "approved") {
    return { ok: false, error: "Aprobá la tarea antes de despachar" };
  }

  const githubRepo = task.resources.github_repo;
  const dispatch = await dispatchBridgeTaskViaGitHubIssue({
    taskId,
    title: task.title,
    instruction: task.instruction,
    githubRepo,
    riskClass: task.risk_class,
  });

  if (!dispatch.ok) {
    await updateBridgeTask(
      taskId,
      { status: "failed" },
      {
        eventType: "dispatch.failed",
        summary: dispatch.error,
        actor: gate.userId,
      }
    );
    revalidatePath(`/control/tareas/${taskId}`);
    return { ok: false, error: dispatch.error };
  }

  await updateBridgeTask(
    taskId,
    {
      status: "dispatched",
      executor: dispatch.simulated ? "manual" : "github_issue",
      external_ref: dispatch.simulated ? null : String(dispatch.issueNumber),
    },
    {
      eventType: "task.dispatched",
      summary: dispatch.simulated
        ? "Despacho simulado (sin token GitHub)"
        : `Issue GitHub #${dispatch.issueNumber}`,
      payload: { issueUrl: dispatch.issueUrl, simulated: dispatch.simulated },
      actor: gate.userId,
    }
  );

  revalidatePath("/control/tareas");
  revalidatePath(`/control/tareas/${taskId}`);
  return { ok: true, issueUrl: dispatch.issueUrl, simulated: dispatch.simulated };
}

export async function registerOperationalTaskResult(
  taskId: string,
  report: BridgeTaskResultReport,
  actor: string
) {
  const status = report.errors?.length ? "failed" : "completed";
  await updateBridgeTask(
    taskId,
    {
      status,
      result_report: report,
    },
    {
      eventType: "task.result",
      summary: report.summary ?? "Resultado registrado",
      payload: report as Record<string, unknown>,
      actor,
    }
  );
}

export async function simulateOperationalTaskCompletion(taskId: string) {
  const gate = await requireControlOwner();
  if (!gate.ok) return { ok: false, error: gate.error };

  const { task } = await loadBridgeTaskById(taskId);
  if (!task) return { ok: false, error: "Tarea no encontrada" };
  if (!["dispatched", "running"].includes(task.status)) {
    return { ok: false, error: "Despachá la tarea primero" };
  }

  const report = buildSimulatedCursorResult();
  await registerOperationalTaskResult(taskId, report, gate.userId);
  revalidatePath("/control/tareas");
  revalidatePath(`/control/tareas/${taskId}`);
  return { ok: true, report };
}
