import { createAdminClient } from "@/lib/supabase/admin";
import { isTiendaProSupabaseConfigured } from "@/lib/platform/tenant-loader";
import { mergeStoreBranding } from "@/lib/branding/merge-branding";
import { parseInstallationBrandingConfig } from "@/lib/branding/parse-installation-branding";
import { TIENDAPRO_DEFAULT_BRANDING, type StoreBrandingConfig } from "@/lib/branding/types";

function parseEnvBrandingJson(): Partial<StoreBrandingConfig> | null {
  const raw = process.env.STORE_BRANDING_JSON;
  if (!raw?.startsWith("{")) return null;
  try {
    return JSON.parse(raw) as Partial<StoreBrandingConfig>;
  } catch {
    return null;
  }
}

/** Branding efectivo en runtime (tienda pública / plantilla ecommerce). */
export async function loadRuntimeStoreBranding(): Promise<StoreBrandingConfig> {
  const envOverride = parseEnvBrandingJson();
  if (envOverride) {
    return mergeStoreBranding(envOverride);
  }

  const slug =
    process.env.TIENDAPRO_INSTALLATION_SLUG ||
    process.env.NEXT_PUBLIC_INSTALLATION_SLUG ||
    "tiendapro-reference";

  if (!isTiendaProSupabaseConfigured()) {
    return mergeStoreBranding({ platformMode: true });
  }

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("platform_installations")
      .select("branding_config, is_reference, company_name")
      .eq("company_slug", slug)
      .maybeSingle();

    const fromDb = parseInstallationBrandingConfig(
      (data?.branding_config as Record<string, unknown>) ?? null
    );
    return mergeStoreBranding({
      ...fromDb,
      brandName:
        fromDb.brandName ??
        (data?.is_reference ? TIENDAPRO_DEFAULT_BRANDING.brandName : data?.company_name ?? undefined),
      platformMode: data?.is_reference ? true : fromDb.platformMode ?? false,
    });
  } catch {
    return mergeStoreBranding({});
  }
}
