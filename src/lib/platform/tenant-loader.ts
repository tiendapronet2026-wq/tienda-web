import { createClient } from "@/lib/supabase/server";
import { getDemoTenant } from "@/lib/tenant/context";
import { resolveEntitlements, type TenantEntitlements } from "@/lib/plans/resolve-modules";
import type { ModuleId } from "@/lib/modules/registry";
import type { PlanId } from "@/lib/plans/catalog";
import {
  isAuthorizedTiendaProSupabaseUrl,
  TIENDAPRO_SUPABASE_PROJECT_REF,
} from "@/lib/platform/supabase-project";

export function getSupabaseProjectRefFromEnv(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).hostname.split(".")[0] || null;
  } catch {
    return null;
  }
}

export function isTiendaProSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return (
    isAuthorizedTiendaProSupabaseUrl(url) &&
    process.env.TIENDAPRO_PLATFORM_DB === "1"
  );
}

export { TIENDAPRO_SUPABASE_PROJECT_REF };

export type TenantContextResult = {
  source: "mock" | "supabase";
  entitlements: TenantEntitlements;
  displayName: string;
  tenantId: string;
};

export async function loadTenantContextForApp(): Promise<TenantContextResult> {
  const demo = getDemoTenant();

  if (!isTiendaProSupabaseConfigured()) {
    return {
      source: "mock",
      entitlements: demo.entitlements,
      displayName: demo.displayName,
      tenantId: demo.tenantId,
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { source: "mock", entitlements: demo.entitlements, displayName: demo.displayName, tenantId: demo.tenantId };
    }

    const { data: membership, error: memErr } = await supabase
      .from("tenant_memberships")
      .select("tenant_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (memErr || !membership?.tenant_id) {
      return { source: "mock", entitlements: demo.entitlements, displayName: demo.displayName, tenantId: demo.tenantId };
    }

    const { data: tenant, error: tenErr } = await supabase
      .from("tenants")
      .select("display_name, plan_id")
      .eq("id", membership.tenant_id)
      .maybeSingle();

    if (tenErr || !tenant) {
      return { source: "mock", entitlements: demo.entitlements, displayName: demo.displayName, tenantId: demo.tenantId };
    }

    const { data: activations } = await supabase
      .from("tenant_module_activations")
      .select("module_id, state")
      .eq("tenant_id", membership.tenant_id);

    const addOnActivations: ModuleId[] = [];
    const suspended: ModuleId[] = [];
    for (const row of activations ?? []) {
      const mid = row.module_id as ModuleId;
      if (row.state === "active") addOnActivations.push(mid);
      if (row.state === "suspended") suspended.push(mid);
    }

    const entitlements: TenantEntitlements = {
      tenantId: membership.tenant_id,
      planId: tenant.plan_id as PlanId,
      addOnActivations,
      suspended,
    };

    return {
      source: "supabase",
      entitlements,
      displayName: tenant.display_name,
      tenantId: membership.tenant_id,
    };
  } catch {
    return { source: "mock", entitlements: demo.entitlements, displayName: demo.displayName, tenantId: demo.tenantId };
  }
}

export async function loadResolvedModulesForApp() {
  const ctx = await loadTenantContextForApp();
  const resolved = resolveEntitlements(ctx.entitlements);
  return { ...ctx, resolved };
}
