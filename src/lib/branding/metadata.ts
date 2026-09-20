import type { Metadata } from "next";
import type { StoreBrandingConfig } from "@/lib/branding/types";

export function buildStoreMetadata(branding: StoreBrandingConfig, siteUrl: string): Metadata {
  const titleDefault = branding.platformMode
    ? `${branding.brandName} | Plataforma comercial y operaciones`
    : `${branding.brandName} | Tienda online`;

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: titleDefault,
      template: `%s | ${branding.brandName}`,
    },
    description: branding.tagline,
    applicationName: branding.brandName,
    manifest: "/site.webmanifest",
    icons: {
      icon: [{ url: branding.faviconUrl, sizes: "32x32", type: "image/png" }],
      apple: [{ url: branding.faviconUrl, sizes: "180x180" }],
    },
    openGraph: {
      type: "website",
      locale: "es_AR",
      url: siteUrl,
      siteName: branding.brandName,
      title: titleDefault,
      description: branding.tagline,
      images: branding.platformMode
        ? [{ url: "/brand/og-tiendapro.png", width: 1200, height: 630, alt: branding.brandName }]
        : undefined,
    },
  };
}
