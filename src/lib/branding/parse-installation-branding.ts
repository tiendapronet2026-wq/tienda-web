import type { StoreBrandingConfig } from "@/lib/branding/types";

function pickString(config: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const v = config[key];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return undefined;
}

/** Normaliza branding_config de BD (camelCase o snake_case legacy). */
export function parseInstallationBrandingConfig(
  config: Record<string, unknown> | null | undefined
): Partial<StoreBrandingConfig> {
  if (!config) return {};
  return {
    brandName: pickString(config, ["brandName", "brand_name"]),
    tagline: pickString(config, ["tagline"]),
    logoUrl: pickString(config, ["logoUrl", "logo_url", "logoPath", "logo_path"]),
    faviconUrl: pickString(config, ["faviconUrl", "favicon_url", "faviconPath", "favicon_path"]),
    primaryColor: pickString(config, ["primaryColor", "primary_color"]),
    secondaryColor: pickString(config, ["secondaryColor", "secondary_color"]),
    fontFamily: pickString(config, ["fontFamily", "font_family"]),
    contactEmail: pickString(config, ["contactEmail", "contact_email"]),
    platformMode:
      config.platformMode === true || config.platformMode === false
        ? config.platformMode
        : config.platform_mode === true || config.platform_mode === false
          ? config.platform_mode
          : undefined,
  };
}
