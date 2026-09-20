import { redirect } from "next/navigation";
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

/** Mock explícito: demos públicas o dev sin flag de plataforma. */
export function isExplicitDevMockMode(): boolean {
  return !isTiendaProSupabaseConfigured();
}

export { TIENDAPRO_SUPABASE_PROJECT_REF };

export type TenantContextResult = {
  source: "mock" | "supabase";
  entitlements: TenantEntitlements;
  displayName: string;
  tenantId: string;
};

function redirectPlatformFailure(kind: "membership" | "database" | "auth"): never {
  if (kind === "database") redirect("/acceso-denegado?error=plataforma");
  redirect("/acceso-denegado");
}

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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirectPlatformFailure("auth");

  try {
    const { data: membership, error: memErr } = await supabase
      .from("tenant_memberships")
      .select("tenant_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (memErr) redirectPlatformFailure("database");
    if (!membership?.tenant_id) redirectPlatformFailure("membership");

    const { data: tenant, error: tenErr } = await supabase
      .from("tenants")
      .select("display_name, plan_id")
      .eq("id", membership.tenant_id)
      .maybeSingle();

    if (tenErr || !tenant) redirectPlatformFailure("database");

    const { data: activations, error: actErr } = await supabase
      .from("tenant_module_activations")
      .select("module_id, state")
      .eq("tenant_id", membership.tenant_id);

    if (actErr) redirectPlatformFailure("database");

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
    redirectPlatformFailure("database");
  }
}

export async function loadResolvedModulesForApp() {
  const ctx = await loadTenantContextForApp();
  const resolved = resolveEntitlements(ctx.entitlements);
  return { ...ctx, resolved };
}

export type ControlTenantRow = {
  id: string;
  name: string;
  plan: string;
  status: string;
  modulesActive: number;
};

export async function loadControlTenantsForPanel(): Promise<{
  source: "mock" | "supabase";
  tenants: ControlTenantRow[];
}> {
  const { controlTenants } = await import("@/lib/mock/control-data");

  if (!isTiendaProSupabaseConfigured()) {
    return { source: "mock", tenants: controlTenants };
  }

  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("tenants")
    .select("id, display_name, plan_id, status")
    .order("display_name");

  if (error) redirectPlatformFailure("database");

  const tenants: ControlTenantRow[] = [];
  for (const row of rows ?? []) {
    const { count } = await supabase
      .from("tenant_module_activations")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", row.id)
      .eq("state", "active");

    tenants.push({
      id: row.id,
      name: row.display_name,
      plan: row.plan_id,
      status: row.status,
      modulesActive: count ?? 0,
    });
  }

  return { source: "supabase", tenants };
}
