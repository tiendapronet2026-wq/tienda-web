import { createClient } from "@/lib/supabase/server";
import { loadSessionPlatformContext } from "@/lib/platform/session-platform";
import { isTiendaProSupabaseConfigured } from "@/lib/platform/tenant-loader";

export type ControlOwnerGateResult =
  | { ok: true; userId: string; supabase: Awaited<ReturnType<typeof createClient>> }
  | { ok: false; error: string; code: "UNAUTHENTICATED" | "FORBIDDEN" | "UNCONFIGURED" };

/**
 * Propietario Control (role owner) verificado en app + función RLS is_control_owner().
 * Obligatorio antes de createAdminClient() en acciones de instalación/grants.
 */
export async function requireControlOwner(): Promise<ControlOwnerGateResult> {
  if (!isTiendaProSupabaseConfigured()) {
    return { ok: false, error: "Plataforma Supabase no configurada", code: "UNCONFIGURED" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Sesión requerida", code: "UNAUTHENTICATED" };
  }

  const ctx = await loadSessionPlatformContext(supabase, user.id);
  if (ctx.controlOperator !== "owner") {
    return {
      ok: false,
      error: "Solo el propietario de Control (owner) puede ejecutar esta acción",
      code: "FORBIDDEN",
    };
  }

  const { data: isOwner, error: rpcError } = await supabase.rpc("is_control_owner");
  if (rpcError || isOwner !== true) {
    return {
      ok: false,
      error: rpcError?.message ?? "is_control_owner() denegó la operación",
      code: "FORBIDDEN",
    };
  }

  return { ok: true, userId: user.id, supabase };
}

export function isControlOwnerRole(ctx: { controlOperator: string | null }): boolean {
  return ctx.controlOperator === "owner";
}
