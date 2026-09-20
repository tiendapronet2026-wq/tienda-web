import { createClient } from "@/lib/supabase/server";
import { loadSessionPlatformContext } from "@/lib/platform/session-platform";
import { canAccessControlPanel } from "@/lib/platform/panel-access";
import { isTiendaProSupabaseConfigured } from "@/lib/platform/tenant-loader";

export type BridgeOperatorGateResult =
  | { ok: true; userId: string }
  | { ok: false; error: string; code: "UNAUTHENTICATED" | "FORBIDDEN" | "UNCONFIGURED" };

/** Operador Control (cualquier rol en control_operators) — crear tareas desde UI. */
export async function requireControlOperator(): Promise<BridgeOperatorGateResult> {
  if (!isTiendaProSupabaseConfigured()) {
    return { ok: false, error: "Plataforma no configurada", code: "UNCONFIGURED" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Sesión requerida", code: "UNAUTHENTICATED" };
  }

  const ctx = await loadSessionPlatformContext(supabase, user.id);
  if (!canAccessControlPanel(ctx)) {
    return { ok: false, error: "Se requiere operador Control", code: "FORBIDDEN" };
  }

  return { ok: true, userId: user.id };
}
