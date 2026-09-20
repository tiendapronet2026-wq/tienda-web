import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export type InstallationOperationRow = {
  installation_id: string;
  operation_type: string;
  environment?: string;
  status: string;
  summary: string;
  metadata?: Record<string, unknown>;
  actor_user_id: string;
};

export async function recordInstallationOperation(
  admin: AdminClient,
  row: InstallationOperationRow
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await admin.from("installation_operations").insert(row);
  if (error) {
    return { ok: false, error: `Auditoría no registrada: ${error.message}` };
  }
  return { ok: true };
}
