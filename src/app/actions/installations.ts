"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isTiendaProSupabaseConfigured } from "@/lib/platform/tenant-loader";
import { buildManifestFromWizardPayload, slugifyCompanyName } from "@/lib/installer/manifest";
import { runInstallationPipeline } from "@/lib/installer/run";

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
  const result = await runInstallationPipeline(manifest);
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
        lifecycle_status: "provisioning",
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
