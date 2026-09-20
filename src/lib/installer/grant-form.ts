import { detectResourceTier } from "@/lib/installer/grants";
import { TIENDAPRO_AUTHORIZED_LINK_TARGETS } from "@/lib/installer/providers/authorized";

export type ResourceGrantInput = {
  installationId: string;
  companySlug: string;
  githubRepo: string;
  vercelProject: string;
  supabaseProjectRef: string;
  primaryDomain?: string | null;
  deployBranch?: string;
};

export function validateResourceGrantInput(input: ResourceGrantInput): string[] {
  const errors: string[] = [];
  if (!input.githubRepo.includes("/")) errors.push("GitHub org/repo inválido");
  if (!input.vercelProject.trim()) errors.push("Proyecto Vercel requerido");
  if (!input.supabaseProjectRef.trim()) errors.push("Supabase ref requerido");

  const g = TIENDAPRO_AUTHORIZED_LINK_TARGETS;
  const uses = [
    input.githubRepo.toLowerCase() === g.githubRepo.toLowerCase(),
    input.vercelProject.toLowerCase() === g.vercelProject.toLowerCase(),
    input.supabaseProjectRef.toLowerCase() === g.supabaseProjectRef.toLowerCase(),
  ];
  const tiendaProCount = uses.filter(Boolean).length;
  if (tiendaProCount > 0 && tiendaProCount < 3) {
    errors.push("No mezclar recursos TiendaPro con recursos de otra empresa en el mismo grant.");
  }

  return errors;
}

export function buildResourceGrantUpsertRow(input: ResourceGrantInput) {
  const deployBranch = input.deployBranch?.trim() || `install/${input.companySlug}`;
  const resourceTier = detectResourceTier(input.githubRepo, input.vercelProject, input.supabaseProjectRef);
  return {
    installation_id: input.installationId,
    environment: "preview" as const,
    github_repo: input.githubRepo.trim(),
    vercel_project: input.vercelProject.trim(),
    supabase_project_ref: input.supabaseProjectRef.trim(),
    primary_domain: input.primaryDomain?.trim() || null,
    deploy_branch: deployBranch,
    resource_tier: resourceTier,
    scopes: [
      "verify",
      "env_write",
      "deploy_preview",
      "migrations_verify",
      "smoke",
      ...(resourceTier === "client_owned" ? (["domain_verify"] as const) : []),
    ],
    active: true,
  };
}
