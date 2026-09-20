"use client";

import type { StoreBrandingConfig } from "@/lib/branding/types";
import { TIENDAPRO_DEFAULT_BRANDING } from "@/lib/branding/types";
import { brandingToCssVariables } from "@/lib/branding/css-vars";
import { BrandWordmark } from "@/components/branding/BrandWordmark";
import { mergeStoreBranding } from "@/lib/branding/merge-branding";

type PreviewInput = Partial<StoreBrandingConfig> & { companyName?: string };

export function BrandingPreview({ input, platformMode = false }: { input: PreviewInput; platformMode?: boolean }) {
  const branding = mergeStoreBranding({
    brandName: input.brandName || input.companyName || "Tu marca",
    tagline: input.tagline,
    logoUrl: input.logoUrl,
    faviconUrl: input.faviconUrl,
    primaryColor: input.primaryColor,
    secondaryColor: input.secondaryColor,
    fontFamily: input.fontFamily || TIENDAPRO_DEFAULT_BRANDING.fontFamily,
    contactEmail: input.contactEmail,
    platformMode,
  });

  const vars = brandingToCssVariables(branding);
  const style = {
    ...vars,
    fontFamily: branding.fontFamily,
  } as React.CSSProperties;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-sm)]" style={style}>
      <div className="border-b border-border px-4 py-3" style={{ borderColor: branding.primaryColor }}>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Vista previa runtime</p>
      </div>
      <header className="flex items-center justify-between gap-3 border-b border-border bg-surface/95 px-4 py-3">
        <span className="flex items-center gap-2">
          {branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logoUrl} alt="" className="h-9 w-9 object-contain" />
          ) : null}
          <BrandWordmark branding={branding} />
        </span>
        <span
          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
          style={{ backgroundColor: branding.primaryColor }}
        >
          CTA
        </span>
      </header>
      <div className="space-y-2 px-4 py-5">
        <p className="text-sm text-text-secondary">{branding.tagline}</p>
        <p className="text-xs text-muted">
          Contacto:{" "}
          <span className="font-medium" style={{ color: branding.secondaryColor }}>
            {branding.contactEmail}
          </span>
        </p>
      </div>
    </div>
  );
}
