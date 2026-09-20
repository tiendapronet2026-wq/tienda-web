import { TIENDAPRO_DEFAULT_BRANDING, type StoreBrandingConfig } from "@/lib/branding/types";

export function mergeStoreBranding(partial: Partial<StoreBrandingConfig>): StoreBrandingConfig {
  const base = TIENDAPRO_DEFAULT_BRANDING;
  const independent = process.env.STORE_INDEPENDENT === "1";
  return {
    brandName: partial.brandName?.trim() || base.brandName,
    tagline: partial.tagline?.trim() || (independent ? "Tienda online" : base.tagline),
    logoUrl: partial.logoUrl?.trim() || base.logoUrl,
    faviconUrl: partial.faviconUrl?.trim() || base.faviconUrl,
    primaryColor: partial.primaryColor?.trim() || base.primaryColor,
    secondaryColor: partial.secondaryColor?.trim() || base.secondaryColor,
    fontFamily: partial.fontFamily?.trim() || base.fontFamily,
    contactEmail: partial.contactEmail?.trim() || base.contactEmail,
    platformMode: partial.platformMode ?? !independent,
  };
}
