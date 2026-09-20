import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isTiendaProSupabaseConfigured } from "@/lib/platform/tenant-loader";
import {
  parseProviderStatus,
  type InstallationOperationRow,
  type InstallationTemplateRow,
  type PlatformInstallationRow,
} from "@/lib/platform/installations/types";

function redirectPlatformFailure(): never {
  redirect("/acceso-denegado?error=plataforma");
}

export async function loadInstallationTemplates(): Promise<{
  source: "mock" | "supabase";
  templates: InstallationTemplateRow[];
}> {
  const { mockTemplates } = await import("@/lib/mock/installations-data");
  if (!isTiendaProSupabaseConfigured()) {
    return { source: "mock", templates: mockTemplates };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("installation_templates")
    .select("template_id, name, description, business_type, status, default_modules")
    .order("name");

  if (error) redirectPlatformFailure();

  return {
    source: "supabase",
    templates: (data ?? []).map((row) => ({
      templateId: row.template_id,
      name: row.name,
      description: row.description,
      businessType: row.business_type,
      status: row.status,
      defaultModules: row.default_modules ?? [],
    })),
  };
}

export async function loadPlatformInstallations(): Promise<{
  source: "mock" | "supabase";
  installations: PlatformInstallationRow[];
}> {
  const { mockInstallations } = await import("@/lib/mock/installations-data");
  if (!isTiendaProSupabaseConfigured()) {
    return { source: "mock", installations: mockInstallations };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("platform_installations")
    .select(
      `
      id, tenant_id, company_name, company_slug, template_id, primary_domain,
      environment, lifecycle_status, installed_version, enabled_modules,
      github_meta, vercel_meta, supabase_meta, branding_config,
      is_reference, updated_at,
      installation_templates ( name )
    `
    )
    .order("is_reference", { ascending: false })
    .order("company_name");

  if (error) redirectPlatformFailure();

  return {
    source: "supabase",
    installations: (data ?? []).map((row) => {
      const rawTpl = row.installation_templates;
      const tpl = Array.isArray(rawTpl) ? rawTpl[0] : rawTpl;
      const templateName =
        tpl && typeof tpl === "object" && "name" in tpl ? String(tpl.name) : row.template_id;
      const githubMeta = (row.github_meta ?? {}) as Record<string, unknown>;
      const vercelMeta = (row.vercel_meta ?? {}) as Record<string, unknown>;
      const supabaseMeta = (row.supabase_meta ?? {}) as Record<string, unknown>;
      return {
        id: row.id,
        tenantId: row.tenant_id,
        companyName: row.company_name,
        companySlug: row.company_slug,
        templateId: row.template_id,
        templateName,
        primaryDomain: row.primary_domain,
        environment: row.environment,
        lifecycleStatus: row.lifecycle_status,
        installedVersion: row.installed_version,
        enabledModules: row.enabled_modules ?? [],
        githubStatus: parseProviderStatus(githubMeta),
        vercelStatus: parseProviderStatus(vercelMeta),
        supabaseStatus: parseProviderStatus(supabaseMeta),
        githubMeta,
        vercelMeta,
        supabaseMeta,
        brandingConfig: (row.branding_config ?? {}) as Record<string, unknown>,
        isReference: row.is_reference,
        updatedAt: row.updated_at,
      };
    }),
  };
}

export async function loadPlatformInstallationById(id: string): Promise<PlatformInstallationRow | null> {
  const { installations } = await loadPlatformInstallations();
  return installations.find((i) => i.id === id) ?? null;
}

export async function loadInstallationOperations(installationId: string): Promise<InstallationOperationRow[]> {
  if (!isTiendaProSupabaseConfigured()) {
    const { mockOperations } = await import("@/lib/mock/installations-data");
    return mockOperations
      .filter((o) => o.installationId === installationId)
      .map((o) => ({
        id: o.id,
        operationType: o.operationType,
        environment: o.environment,
        status: o.status,
        summary: o.summary,
        createdAt: o.createdAt,
      }));
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("installation_operations")
    .select("id, operation_type, environment, status, summary, created_at")
    .eq("installation_id", installationId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) redirectPlatformFailure();

  return (data ?? []).map((row) => ({
    id: row.id,
    operationType: row.operation_type,
    environment: row.environment,
    status: row.status,
    summary: row.summary,
    createdAt: row.created_at,
  }));
}

export async function loadOpenWizardDraftForUser() {
  if (!isTiendaProSupabaseConfigured()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("installation_wizard_drafts")
    .select("id, current_step, payload, updated_at")
    .eq("created_by", user.id)
    .eq("status", "open")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}
