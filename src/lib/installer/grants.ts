import { createAdminClient } from "@/lib/supabase/admin";
import { TIENDAPRO_AUTHORIZED_LINK_TARGETS } from "@/lib/installer/providers/authorized";

export type InstallationResourceGrant = {
  id: string;
  installationId: string;
  environment: "production" | "staging" | "preview";
  githubRepo: string;
  vercelProject: string;
  supabaseProjectRef: string;
  primaryDomain: string | null;
  deployBranch: string;
  scopes: string[];
  resourceTier: "platform_test" | "client_owned";
};

export type GrantRow = {
  id: string;
  installation_id: string;
  environment: string;
  github_repo: string;
  vercel_project: string;
  supabase_project_ref: string;
  primary_domain: string | null;
  deploy_branch: string;
  scopes: string[];
  resource_tier?: string;
};

function mapGrant(row: GrantRow): InstallationResourceGrant {
  return {
    id: row.id,
    installationId: row.installation_id,
    environment: row.environment as InstallationResourceGrant["environment"],
    githubRepo: row.github_repo,
    vercelProject: row.vercel_project,
    supabaseProjectRef: row.supabase_project_ref,
    primaryDomain: row.primary_domain,
    deployBranch: row.deploy_branch,
    scopes: row.scopes ?? [],
    resourceTier: (row.resource_tier === "platform_test" ? "platform_test" : "client_owned") as
      | "platform_test"
      | "client_owned",
  };
}

export async function loadActiveInstallationGrant(
  installationId: string,
  environment: InstallationResourceGrant["environment"] = "preview"
): Promise<InstallationResourceGrant | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("installation_resource_grants")
    .select(
      "id, installation_id, environment, github_repo, vercel_project, supabase_project_ref, primary_domain, deploy_branch, scopes, resource_tier"
    )
    .eq("installation_id", installationId)
    .eq("environment", environment)
    .eq("active", true)
    .maybeSingle();

  if (!data) return null;
  return mapGrant(data as GrantRow);
}

export function manifestMatchesGrant(
  manifest: {
    primaryDomain: string | null;
    providers: {
      github: { repo?: string };
      vercel: { project?: string };
      supabase: { projectRef?: string };
    };
  },
  grant: InstallationResourceGrant
): string[] {
  const errors: string[] = [];
  const gh = (manifest.providers.github.repo ?? "").trim().toLowerCase();
  const vc = (manifest.providers.vercel.project ?? "").trim().toLowerCase();
  const sb = (manifest.providers.supabase.projectRef ?? "").trim().toLowerCase();

  if (gh !== grant.githubRepo.toLowerCase()) {
    errors.push("GitHub del manifiesto no coincide con la autorización de la instalación.");
  }
  if (vc !== grant.vercelProject.toLowerCase()) {
    errors.push("Vercel del manifiesto no coincide con la autorización.");
  }
  if (sb !== grant.supabaseProjectRef.toLowerCase()) {
    errors.push("Supabase del manifiesto no coincide con la autorización.");
  }
  if (grant.primaryDomain && manifest.primaryDomain) {
    if (grant.primaryDomain.toLowerCase() !== manifest.primaryDomain.toLowerCase()) {
      errors.push("Dominio del manifiesto no coincide con la autorización.");
    }
  }
  return errors;
}

export function grantHasScope(grant: InstallationResourceGrant, scope: string): boolean {
  return grant.scopes.includes(scope);
}

export function detectResourceTier(
  githubRepo: string,
  vercelProject: string,
  supabaseProjectRef: string
): "platform_test" | "client_owned" {
  const g = TIENDAPRO_AUTHORIZED_LINK_TARGETS;
  if (
    githubRepo.toLowerCase() === g.githubRepo.toLowerCase() &&
    vercelProject.toLowerCase() === g.vercelProject.toLowerCase() &&
    supabaseProjectRef.toLowerCase() === g.supabaseProjectRef.toLowerCase()
  ) {
    return "platform_test";
  }
  return "client_owned";
}

export async function loadLastCompletedInstallSteps(installationId: string): Promise<Set<string>> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("installation_operations")
    .select("metadata")
    .eq("installation_id", installationId)
    .eq("operation_type", "install.real")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const steps = (data?.metadata as { steps?: Array<{ step: string; status: string }> } | undefined)?.steps;
  if (!steps?.length) return new Set();
  return new Set(steps.filter((s) => s.status === "ok").map((s) => s.step));
}
