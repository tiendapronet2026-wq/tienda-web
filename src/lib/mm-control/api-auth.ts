import { createClient } from "@/lib/supabase/server";
import { canAccessControlPanel } from "@/lib/platform/panel-access";
import { loadSessionPlatformContext } from "@/lib/platform/session-platform";
import { isTiendaProSupabaseConfigured } from "@/lib/platform/tenant-loader";

export async function requireMmControlApiActor(): Promise<
  { ok: true; actorRef: string } | { ok: false; status: number; error: string }
> {
  if (!isTiendaProSupabaseConfigured()) {
    return { ok: false, status: 503, error: "platform_db_disabled" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401, error: "unauthorized" };

  try {
    const ctx = await loadSessionPlatformContext(supabase, user.id);
    if (!canAccessControlPanel(ctx)) {
      return { ok: false, status: 403, error: "forbidden" };
    }
  } catch {
    return { ok: false, status: 403, error: "forbidden" };
  }

  return { ok: true, actorRef: `tiendapro:${user.id}` };
}
