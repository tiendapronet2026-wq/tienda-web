import type { BridgeTaskResultReport, BridgeTaskStatus } from "@/lib/bridge/constants";
import { deliverBridgeReportToPullRequest } from "@/lib/bridge/github-delivery";
import type { BridgeTaskRow } from "@/lib/bridge/repository";

export async function enrichReportWithGithubDelivery(
  task: Pick<BridgeTaskRow, "id" | "title">,
  taskStatus: BridgeTaskStatus,
  report: BridgeTaskResultReport
): Promise<BridgeTaskResultReport> {
  const delivery = await deliverBridgeReportToPullRequest({
    taskId: task.id,
    taskTitle: task.title,
    taskStatus,
    report,
  });

  if (delivery.ok) {
    return {
      ...report,
      githubReportCommentUrl: delivery.commentUrl,
      githubReportDeliveryError: null,
    };
  }

  if (delivery.skipped) {
    return {
      ...report,
      githubReportDeliveryError: delivery.error,
    };
  }

  return {
    ...report,
    githubReportDeliveryError: delivery.error,
  };
}
