import type { StoreBrandingConfig } from "@/lib/branding/types";
import { brandingToCssVariables } from "@/lib/branding/css-vars";

export function BrandingStyles({ branding }: { branding: StoreBrandingConfig }) {
  const vars = brandingToCssVariables(branding);
  const css = `:root{${Object.entries(vars)
    .map(([k, v]) => `${k}:${v}`)
    .join(";")}}`;
  return <style id="store-branding-vars">{css}</style>;
}
