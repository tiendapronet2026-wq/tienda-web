import { TIENDAPRO_AUTHORIZED_LINK_TARGETS } from "@/lib/installer/providers/authorized";
import { TIENDAPRO_SUPABASE_PROJECT_REF } from "@/lib/platform/supabase-project";

export const BRIDGE_PILOT_PROJECT_SLUG = "tiendapro";

export const BRIDGE_AUTHORIZED_GITHUB_REPO = TIENDAPRO_AUTHORIZED_LINK_TARGETS.githubRepo;
export const BRIDGE_AUTHORIZED_SUPABASE_REF = TIENDAPRO_SUPABASE_PROJECT_REF;
export const BRIDGE_AUTHORIZED_VERCEL_PROJECT = TIENDAPRO_AUTHORIZED_LINK_TARGETS.vercelProject;

export type BridgeTaskRiskClass = "minor" | "critical";
export type BridgeTaskStatus =
  | "pending_approval"
  | "approved"
  | "dispatched"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type BridgeTaskResources = {
  github_repo: string;
  supabase_project_ref: string;
  vercel_project?: string | null;
};

export type BridgeTaskResultReport = {
  summary?: string;
  filesChanged?: string[];
  tests?: {
    name: string;
    status: "pass" | "fail" | "skipped";
    claimed?: "pass" | "fail" | "unknown";
  }[];
  prUrl?: string | null;
  deployUrl?: string | null;
  errors?: string[];
  nextAction?: string | null;
  pendingItems?: string[];
  simulated?: boolean;
  trustLevel?: "owner_verified" | "external_unverified";
  testsVerified?: boolean;
  githubReportCommentUrl?: string | null;
  githubReportDeliveryError?: string | null;
};
