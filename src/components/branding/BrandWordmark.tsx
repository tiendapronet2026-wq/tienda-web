import type { StoreBrandingConfig } from "@/lib/branding/types";

export function BrandWordmark({
  branding,
  className = "",
}: {
  branding: StoreBrandingConfig;
  className?: string;
}) {
  if (branding.platformMode && branding.brandName === "TiendaPro") {
    return (
      <span className={`text-xl font-extrabold tracking-tight text-foreground sm:text-[1.35rem] ${className}`}>
        Tienda<span className="text-brand">Pro</span>
      </span>
    );
  }
  return (
    <span className={`text-xl font-extrabold tracking-tight text-foreground sm:text-[1.35rem] ${className}`}>
      {branding.brandName}
    </span>
  );
}
