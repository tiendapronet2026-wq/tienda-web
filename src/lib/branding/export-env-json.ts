import type { InstallationBrandingConfig } from "@/lib/installer/manifest";
import { mergeStoreBranding } from "@/lib/branding/merge-branding";
import type { StoreBrandingConfig } from "@/lib/branding/types";

/** Convierte branding del manifiesto al JSON de STORE_BRANDING_JSON para despliegues independientes. */
export function brandingConfigToStoreEnvJson(branding: InstallationBrandingConfig): string {
  const merged = mergeStoreBranding({
    brandName: branding.brandName,
    tagline: branding.tagline,
    logoUrl: branding.logoUrl,
    faviconUrl: branding.faviconUrl,
    primaryColor: branding.primaryColor,
    secondaryColor: branding.secondaryColor,
    fontFamily: branding.fontFamily,
    contactEmail: branding.contactEmail,
    platformMode: false,
  });
  const payload: Pick<
    StoreBrandingConfig,
    | "brandName"
    | "tagline"
    | "logoUrl"
    | "faviconUrl"
    | "primaryColor"
    | "secondaryColor"
    | "fontFamily"
    | "contactEmail"
  > = {
    brandName: merged.brandName,
    tagline: merged.tagline,
    logoUrl: merged.logoUrl,
    faviconUrl: merged.faviconUrl,
    primaryColor: merged.primaryColor,
    secondaryColor: merged.secondaryColor,
    fontFamily: merged.fontFamily,
    contactEmail: merged.contactEmail,
  };
  return JSON.stringify(payload);
}
