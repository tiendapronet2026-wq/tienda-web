import { describe, expect, it } from "vitest";
import { parseInstallationBrandingConfig } from "@/lib/branding/parse-installation-branding";
import { mergeStoreBranding } from "@/lib/branding/merge-branding";
import { TIENDAPRO_DEFAULT_BRANDING } from "@/lib/branding/types";

describe("store branding", () => {
  it("parsea snake_case legacy de referencia TiendaPro", () => {
    const partial = parseInstallationBrandingConfig({
      brand_name: "TiendaPro",
      logo_path: "/brand/icons/logo-tiendapro-icon.png",
    });
    expect(partial.brandName).toBe("TiendaPro");
    expect(partial.logoUrl).toBe("/brand/icons/logo-tiendapro-icon.png");
  });

  it("merge conserva defaults TiendaPro sin overrides", () => {
    const merged = mergeStoreBranding({});
    expect(merged.brandName).toBe(TIENDAPRO_DEFAULT_BRANDING.brandName);
    expect(merged.primaryColor).toBe(TIENDAPRO_DEFAULT_BRANDING.primaryColor);
    expect(merged.platformMode).toBe(true);
  });

  it("merge aplica marca ficticia", () => {
    const merged = mergeStoreBranding({
      brandName: "Acme Demo",
      primaryColor: "#ff00aa",
      platformMode: false,
    });
    expect(merged.brandName).toBe("Acme Demo");
    expect(merged.primaryColor).toBe("#ff00aa");
    expect(merged.platformMode).toBe(false);
  });
});
