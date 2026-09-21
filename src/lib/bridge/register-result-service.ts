import type { BridgeTaskResultReport } from "@/lib/bridge/constants";
import {
  canAcceptExternalResult,
  resultStatusFromReport,
  sanitizeExternalBridgeResult,
} from "@/lib/bridge/register-result";
import { enrichReportWithGithubDelivery } from "@/lib/bridge/apply-github-report-delivery";
import { loadBridgeTaskByIdForBridgeApi, updateBridgeTask } from "@/lib/bridge/repository";

export async function registerBridgeTaskResultExternal(
  taskId: string,
  body: Record<string, unknown>
): Promise<
  | { ok: true; status: string; github_report_comment_url?: string | null }
  | { ok: false; error: string; status?: number }
> {
  const sanitized = sanitizeExternalBridgeResult(body);
  if (!sanitized.ok) {
    return { ok: false, error: sanitized.error, status: 400 };
  }

  const { task } = await loadBridgeTaskByIdForBridgeApi(taskId);
  if (!task) {
    return { ok: false, error: "No encontrada", status: 404 };
  }

  if (!canAcceptExternalResult(task.status)) {
    return {
      ok: false,
      error: "Solo se aceptan resultados en tareas dispatched o running (no sustituye aprobación owner)",
      status: 409,
    };
  }

  let report = sanitized.report;
  const status = resultStatusFromReport(report);
  report = await enrichReportWithGithubDelivery(task, status, report);

  await updateBridgeTask(
    taskId,
    {
      status,
      result_report: report,
    },
    {
      eventType: "task.result.external",
      summary: report.summary ?? "Resultado externo registrado",
      payload: {
        trustLevel: report.trustLevel,
        testsVerified: false,
        githubReportCommentUrl: report.githubReportCommentUrl ?? null,
      },
      actor: "bridge_api",
    }
  );

  if (report.githubReportCommentUrl) {
    await updateBridgeTask(taskId, {}, {
      eventType: "task.report.github",
      summary: "Informe publicado en comentario del PR",
      payload: { url: report.githubReportCommentUrl },
      actor: "bridge_api",
    });
  }

  return {
    ok: true,
    status,
    github_report_comment_url: report.githubReportCommentUrl ?? null,
  };
}

export async function registerBridgeTaskResultOwner(
  taskId: string,
  report: BridgeTaskResultReport,
  ownerUserId: string
) {
  const { task } = await loadBridgeTaskByIdForBridgeApi(taskId);
  if (!task) {
    return { ok: false as const, error: "Tarea no encontrada" };
  }
  if (!["dispatched", "running"].includes(task.status)) {
    return { ok: false as const, error: "Despachá la tarea primero" };
  }

  const enriched: BridgeTaskResultReport = {
    ...report,
    trustLevel: "owner_verified",
    testsVerified: report.testsVerified ?? true,
  };

  const status = resultStatusFromReport(enriched);
  const finalReport = await enrichReportWithGithubDelivery(task, status, enriched);
  await updateBridgeTask(
    taskId,
    { status, result_report: finalReport },
    {
      eventType: "task.result.owner",
      summary: finalReport.summary ?? "Resultado registrado por owner",
      payload: finalReport as Record<string, unknown>,
      actor: ownerUserId,
    }
  );
  if (finalReport.githubReportCommentUrl) {
    await updateBridgeTask(taskId, {}, {
      eventType: "task.report.github",
      summary: "Informe publicado en comentario del PR",
      payload: { url: finalReport.githubReportCommentUrl },
      actor: ownerUserId,
    });
  }
  return { ok: true as const, githubReportCommentUrl: finalReport.githubReportCommentUrl ?? null };
}
