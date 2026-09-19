import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  canAccessAppPanel,
  canAccessControlPanel,
} from "@/lib/platform/panel-access";
import { loadSessionPlatformContext } from "@/lib/platform/session-platform";
import { isTiendaProSupabaseConfigured } from "@/lib/platform/tenant-loader";

export async function requireControlPanelAccess() {
  if (!isTiendaProSupabaseConfigured()) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/control");

  try {
    const ctx = await loadSessionPlatformContext(supabase, user.id);
    if (!canAccessControlPanel(ctx)) redirect("/acceso-denegado");
  } catch {
    redirect("/acceso-denegado?error=plataforma");
  }
}

export async function requireAppPanelAccess() {
  if (!isTiendaProSupabaseConfigured()) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/app");

  try {
    const ctx = await loadSessionPlatformContext(supabase, user.id);
    if (!canAccessAppPanel(ctx)) redirect("/acceso-denegado");
  } catch {
    redirect("/acceso-denegado?error=plataforma");
  }
}
