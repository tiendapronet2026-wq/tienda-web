"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isTiendaProSupabaseConfigured } from "@/lib/platform/tenant-loader";
import { buildManifestFromWizardPayload, slugifyCompanyName } from "@/lib/installer/manifest";
import { runInstallationPipeline } from "@/lib/installer/run";
import { classifyInstallationOutcome } from "@/lib/installer/outcome";
import {
  loadActiveInstallationGrant,
  loadLastCompletedInstallSteps,
  manifestMatchesGrant,
} from "@/lib/installer/grants";
import { buildResourceGrantUpsertRow, validateResourceGrantInput } from "@/lib/installer/grant-form";

function parsePayload(formData: FormData): Record<string, unknown> {
  const raw = formData.get("payload");
  if (typeof raw === "string" && raw.startsWith("{")) {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return {};
}

export async function saveInstallationWizardDraft(formData: FormData) {
  if (!isTiendaProSupabaseConfigured()) {
    return { ok: true, mock: true };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/control/instalaciones/nueva");

  const draftId = String(formData.get("draft_id") ?? "").trim() || null;
  const currentStep = Number(formData.get("current_step") ?? 1);
  const payload = parsePayload(formData);

  if (draftId) {
    await supabase
      .from("installation_wizard_drafts")
      .update({ current_step: currentStep, payload, updated_at: new Date().toISOString() })
      .eq("id", draftId)
      .eq("created_by", user.id);
    revalidatePath("/control/instalaciones/nueva");
    return { ok: true, draftId };
  }

  const { data, error } = await supabase
    .from("installation_wizard_drafts")
    .insert({
      created_by: user.id,
      current_step: currentStep,
      payload,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/control/instalaciones/nueva");
  return { ok: true, draftId: data.id };
}

export async function runInstallationDryRun(formData: FormData) {
  const payload = parsePayload(formData);
  if (!payload.companyName) {
    payload.companyName = String(formData.get("company_name") ?? "Empresa demo");
  }
  if (!payload.companySlug) {
    payload.companySlug = slugifyCompanyName(String(payload.companyName));
  }

  const manifest = buildManifestFromWizardPayload(payload, { dryRun: true });
  const result = await runInstallationPipeline(manifest);

  if (!isTiendaProSupabaseConfigured()) {
    return { ok: result.ok, result, mock: true };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/control/instalaciones/nueva");

  let installationId = String(formData.get("installation_id") ?? "").trim() || null;

  const admin = createAdminClient();

  if (!installationId) {
    const { data: inst, error } = await admin
      .from("platform_installations")
      .insert({
        company_name: manifest.companyName,
        company_slug: manifest.companySlug,
        template_id: manifest.templateId,
        primary_domain: manifest.primaryDomain,
        lifecycle_status: "draft",
        enabled_modules: manifest.enabledModules,
        github_meta: { status: "simulated", ...manifest.providers.github },
        vercel_meta: { status: "simulated", ...manifest.providers.vercel },
        supabase_meta: { status: "simulated", ...manifest.providers.supabase },
        branding_config: manifest.branding,
      })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message, result };
    installationId = inst.id;
  }

  await admin.from("installation_operations").insert({
    installation_id: installationId,
    operation_type: "install.dry_run",
    environment: "production",
    status: "simulated",
    summary: result.ok ? "Manifiesto validado (simulación)" : "Manifiesto con errores",
    metadata: { steps: result.steps, manifest: result.manifest },
    actor_user_id: user.id,
  });

  revalidatePath("/control/instalaciones");
  if (installationId) revalidatePath(`/control/instalaciones/${installationId}`);

  return { ok: result.ok, result, installationId };
}

/** Verificación real de vínculos (requiere tokens INSTALLER_* en servidor). No provisiona recursos. */
export async function verifyProviderConnections(formData: FormData) {
  const payload = parsePayload(formData);
  if (!payload.companyName) {
    payload.companyName = String(formData.get("company_name") ?? "Empresa demo");
  }

  payload.githubConnected = Boolean(String(payload.githubRepo ?? "").includes("/"));
  payload.vercelConnected = Boolean(String(payload.vercelProject ?? "").trim());
  payload.supabaseConnected = Boolean(String(payload.supabaseRef ?? "").trim());
  payload.githubSimulated = false;
  payload.vercelSimulated = false;
  payload.supabaseSimulated = false;

  const manifest = buildManifestFromWizardPayload(payload, { dryRun: false });
  if (payload.installationId) {
    manifest.installationId = String(payload.installationId);
  }
  const grant = manifest.installationId
    ? await loadActiveInstallationGrant(manifest.installationId, manifest.installEnvironment)
    : null;
  const result = await runInstallationPipeline(manifest, { grant });
  const providerSteps = result.steps.filter((s) => s.step.startsWith("providers."));

  const failed = providerSteps.some((s) => s.status === "failed");
  const verified = providerSteps.filter((s) => s.status === "ok").length;

  if (isTiendaProSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const installationId = String(formData.get("installation_id") ?? "").trim();
      if (installationId) {
        const admin = createAdminClient();
        await admin.from("installation_operations").insert({
          installation_id: installationId,
          operation_type: "install.verify_links",
          environment: "production",
          status: failed ? "failed" : verified > 0 ? "ok" : "skipped",
          summary: failed
            ? "Verificación de vínculos con errores"
            : verified > 0
              ? `${verified} proveedor(es) verificados`
              : "Tokens no configurados — verificación omitida",
          metadata: { steps: providerSteps },
          actor_user_id: user.id,
        });
        revalidatePath(`/control/instalaciones/${installationId}`);
      }
    }
  }

  return {
    ok: !failed,
    verifiedCount: verified,
    steps: providerSteps,
    tokensConfigured: {
      github: Boolean(process.env.INSTALLER_GITHUB_TOKEN?.trim()),
      vercel: Boolean(process.env.INSTALLER_VERCEL_TOKEN?.trim()),
      supabase: Boolean(process.env.INSTALLER_SUPABASE_ACCESS_TOKEN?.trim()),
    },
  };
}

export async function registerSimulatedInstallation(formData: FormData): Promise<void> {
  const payload = parsePayload(formData);
  const manifest = buildManifestFromWizardPayload(payload, { dryRun: true });
  const result = await runInstallationPipeline(manifest);
  if (!result.ok) {
    throw new Error("Manifiesto inválido");
  }

  if (!isTiendaProSupabaseConfigured()) {
    redirect("/control/instalaciones?mock=1");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/control/instalaciones/nueva");

  const admin = createAdminClient();
  const { data: inst, error } = await admin
    .from("platform_installations")
    .upsert(
      {
        company_name: manifest.companyName,
        company_slug: manifest.companySlug,
        template_id: manifest.templateId,
        primary_domain: manifest.primaryDomain,
        lifecycle_status: "draft",
        installed_version: "3.0.0",
        enabled_modules: manifest.enabledModules,
        github_meta: { status: "simulated", ...manifest.providers.github },
        vercel_meta: { status: "simulated", ...manifest.providers.vercel },
        supabase_meta: { status: "simulated", isolated: true, ...manifest.providers.supabase },
        branding_config: manifest.branding,
        is_reference: false,
      },
      { onConflict: "company_slug" }
    )
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  await admin.from("installation_operations").insert({
    installation_id: inst.id,
    operation_type: "install.register",
    status: "simulated",
    summary: "Instancia registrada (sin cloud real)",
    metadata: { manifest },
    actor_user_id: user.id,
  });

  const draftId = String(formData.get("draft_id") ?? "").trim();
  if (draftId) {
    await supabase
      .from("installation_wizard_drafts")
      .update({ status: "completed", linked_installation_id: inst.id })
      .eq("id", draftId);
  }

  revalidatePath("/control/instalaciones");
  redirect(`/control/instalaciones/${inst.id}`);
}

/** Autorización explícita de recursos para una instalación (control owner). */
export async function createInstallationResourceGrant(formData: FormData) {
  if (!isTiendaProSupabaseConfigured()) {
    return { ok: false, error: "Supabase no configurado" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/control/instalaciones");

  const installationId = String(formData.get("installation_id") ?? "").trim();
  if (!installationId) return { ok: false, error: "installation_id requerido" };

  const admin = createAdminClient();
  const { data: inst } = await admin
    .from("platform_installations")
    .select("company_slug, is_reference")
    .eq("id", installationId)
    .maybeSingle();

  if (!inst || inst.is_reference) {
    return { ok: false, error: "Instalación inválida o de referencia" };
  }

  const githubRepo = String(formData.get("github_repo") ?? "").trim();
  const vercelProject = String(formData.get("vercel_project") ?? "").trim();
  const supabaseRef = String(formData.get("supabase_ref") ?? "").trim();

  const validationErrors = validateResourceGrantInput({
    installationId,
    companySlug: inst.company_slug,
    githubRepo,
    vercelProject,
    supabaseProjectRef: supabaseRef,
    primaryDomain: String(formData.get("primary_domain") ?? "").trim() || null,
  });
  if (validationErrors.length) {
    return { ok: false, error: validationErrors.join(" ") };
  }

  const grant = buildResourceGrantUpsertRow({
    installationId,
    companySlug: inst.company_slug,
    githubRepo,
    vercelProject,
    supabaseProjectRef: supabaseRef,
    primaryDomain: String(formData.get("primary_domain") ?? "").trim() || null,
    deployBranch: String(formData.get("deploy_branch") ?? "").trim() || undefined,
  });

  const { error } = await admin.from("installation_resource_grants").upsert(grant, {
    onConflict: "installation_id,environment",
  });

  if (error) return { ok: false, error: error.message };

  await admin.from("installation_operations").insert({
    installation_id: installationId,
    operation_type: "install.authorize_grant",
    status: "succeeded",
    summary:
      grant.resource_tier === "platform_test"
        ? "Grant de prueba técnica (infra TiendaPro) — no live independiente"
        : "Grant de recursos propios del cliente",
    metadata: {
      deployBranch: grant.deploy_branch,
      resourceTier: grant.resource_tier,
      githubRepo: grant.github_repo,
      vercelProject: grant.vercel_project,
      supabaseRef: grant.supabase_project_ref,
    },
    actor_user_id: user.id,
  });

  revalidatePath(`/control/instalaciones/${installationId}`);
  return { ok: true, deployBranch: grant.deploy_branch, resourceTier: grant.resource_tier };
}

export async function runExistingResourcesInstallation(formData: FormData) {
  const payload = parsePayload(formData);
  const installationId = String(formData.get("installation_id") ?? payload.installationId ?? "").trim();
  if (!installationId) {
    return { ok: false, error: "installation_id requerido" };
  }

  const admin = createAdminClient();
  if (!payload.companyName) {
    const { data: row } = await admin
      .from("platform_installations")
      .select(
        "company_name, company_slug, template_id, primary_domain, enabled_modules, branding_config, vercel_meta"
      )
      .eq("id", installationId)
      .maybeSingle();
    if (row) {
      payload.companyName = row.company_name;
      payload.companySlug = row.company_slug;
      payload.templateId = row.template_id;
      payload.primaryDomain = row.primary_domain;
      payload.modules = row.enabled_modules;
      const branding = (row.branding_config ?? {}) as Record<string, unknown>;
      Object.assign(payload, branding);
    }
  }

  payload.installationId = installationId;
  payload.runMode = "existing_resources";
  payload.installEnvironment = "preview";

  const grant = await loadActiveInstallationGrant(installationId, "preview");
  if (!grant) {
    return { ok: false, error: "Sin grant activo — autorizá recursos del cliente primero" };
  }

  payload.githubRepo = grant.githubRepo;
  payload.vercelProject = grant.vercelProject;
  payload.supabaseRef = grant.supabaseProjectRef;
  payload.githubConnected = true;
  payload.vercelConnected = true;
  payload.supabaseConnected = true;
  payload.githubSimulated = false;
  payload.vercelSimulated = false;
  payload.supabaseSimulated = false;

  const manifest = buildManifestFromWizardPayload(payload, { dryRun: false });
  manifest.installationId = installationId;

  const mismatch = manifestMatchesGrant(manifest, grant);
  if (mismatch.length) {
    return { ok: false, error: mismatch.join(" ") };
  }

  const resume = String(formData.get("resume") ?? "") === "1";
  const completedSteps = resume ? await loadLastCompletedInstallSteps(installationId) : new Set<string>();

  const { data: instMeta } = await admin
    .from("platform_installations")
    .select("vercel_meta")
    .eq("id", installationId)
    .maybeSingle();
  const previousDeployUrl =
    typeof (instMeta?.vercel_meta as Record<string, unknown>)?.deployment_url === "string"
      ? String((instMeta?.vercel_meta as Record<string, unknown>).deployment_url)
      : undefined;

  const supabaseAnonKey = String(formData.get("client_supabase_anon_key") ?? "").trim();
  const siteUrl = String(formData.get("client_site_url") ?? "").trim();

  if (!isTiendaProSupabaseConfigured()) {
    const result = await runInstallationPipeline(manifest, {
      grant,
      completedSteps,
      deploymentUrl: previousDeployUrl,
      clientEnv: {
        supabaseAnonKey: supabaseAnonKey || undefined,
        siteUrl: siteUrl || undefined,
      },
    });
    const outcome = classifyInstallationOutcome(result, grant);
    return { ok: outcome.pipelineComplete, result, outcome, mock: true };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/control/instalaciones");

  await admin.from("installation_operations").insert({
    installation_id: installationId,
    operation_type: "install.real",
    environment: "preview",
    status: "running",
    summary: "Instalación con recursos existentes iniciada",
    metadata: { manifest: { companySlug: manifest.companySlug, templateId: manifest.templateId } },
    actor_user_id: user.id,
  });

  const result = await runInstallationPipeline(manifest, {
    grant,
    completedSteps,
    deploymentUrl: previousDeployUrl,
    clientEnv: {
      supabaseAnonKey: supabaseAnonKey || undefined,
      siteUrl: siteUrl || undefined,
    },
  });
  const outcome = classifyInstallationOutcome(result, grant);

  await admin
    .from("platform_installations")
    .update({
      company_name: manifest.companyName,
      template_id: manifest.templateId,
      primary_domain: manifest.primaryDomain,
      enabled_modules: manifest.enabledModules,
      branding_config: manifest.branding,
      github_meta: { status: "connected", repo: grant.githubRepo },
      vercel_meta: {
        status: outcome.pipelineComplete ? "connected" : "pending",
        project: grant.vercelProject,
        deployment_url: result.deploymentUrl ?? previousDeployUrl ?? null,
        deploy_branch: grant.deployBranch,
      },
      supabase_meta: {
        status: "connected",
        isolated: grant.resourceTier === "client_owned",
        project_ref: grant.supabaseProjectRef,
      },
      lifecycle_status: outcome.lifecycleStatus,
      installed_version: outcome.isIndependentLive ? "3.0.0" : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", installationId);

  await admin.from("installation_operations").insert({
    installation_id: installationId,
    operation_type: "install.real",
    environment: "preview",
    status: outcome.pipelineComplete ? "succeeded" : "failed",
    summary: outcome.summary,
    metadata: {
      steps: result.steps,
      deploymentUrl: result.deploymentUrl,
      lifecycleStatus: outcome.lifecycleStatus,
      resourceTier: grant.resourceTier,
    },
    actor_user_id: user.id,
  });

  revalidatePath("/control/instalaciones");
  revalidatePath(`/control/instalaciones/${installationId}`);

  return {
    ok: outcome.pipelineComplete,
    result,
    outcome,
    complete: outcome.isIndependentLive,
  };
}
