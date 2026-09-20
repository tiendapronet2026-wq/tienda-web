import type { StoreBrandingConfig } from "@/lib/branding/types";

export function brandingToCssVariables(b: StoreBrandingConfig): Record<string, string> {
  return {
    "--brand-primary": b.primaryColor,
    "--brand-primary-hover": b.primaryColor,
    "--brand-secondary": b.secondaryColor,
    "--brand-secondary-hover": b.secondaryColor,
    "--ring": b.secondaryColor,
  };
}
