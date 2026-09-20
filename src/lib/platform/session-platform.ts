import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type ControlOperatorRole,
  type SessionPlatformContext,
  type TenantMembershipRole,
} from "@/lib/platform/rls-helpers";

type OperatorRow = { role: ControlOperatorRole };
type MembershipRow = {
  tenant_id: string;
  role: TenantMembershipRole;
  status: "active" | "suspended";
};

export async function loadSessionPlatformContext(
  supabase: SupabaseClient,
  userId: string
): Promise<SessionPlatformContext> {
  const [{ data: operator, error: opErr }, { data: memberships, error: memErr }] = await Promise.all([
    supabase.from("control_operators").select("role").eq("user_id", userId).maybeSingle<OperatorRow>(),
    supabase
      .from("tenant_memberships")
      .select("tenant_id, role, status")
      .eq("user_id", userId),
  ]);

  if (opErr) {
    throw new Error(`control_operators:${opErr.message}`);
  }
  if (memErr) {
    throw new Error(`tenant_memberships:${memErr.message}`);
  }

  return {
    userId,
    controlOperator: operator?.role ?? null,
    memberships: (memberships ?? []).map((m: MembershipRow) => ({
      tenantId: m.tenant_id,
      role: m.role,
      status: m.status,
    })),
  };
}
