/**
 * Plantilla ecommerce reutilizable (TiendaPro store).
 * Identidad vía branding_config en instalación — sin IDs hardcodeados de cliente.
 */
export const ECOMMERCE_STORE_TEMPLATE_ID = "ecommerce-store-v1";

export type TemplateBrandingConfig = {
  brandName?: string;
  tagline?: string;
  logoPath?: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  contactEmail?: string;
};

export function resolveBrandingFromInstallation(config: TemplateBrandingConfig | null | undefined) {
  return {
    brandName: config?.brandName ?? "Tienda",
    logoPath: config?.logoUrl ?? config?.logoPath ?? "/brand/icons/logo-tiendapro-icon.png",
    primaryColor: config?.primaryColor ?? "var(--color-brand)",
    secondaryColor: config?.secondaryColor ?? "var(--color-brand-secondary)",
    fontFamily: config?.fontFamily ?? "var(--font-sans)",
    contactEmail: config?.contactEmail ?? "contacto@tienda.local",
  };
}

/** Rutas core incluidas en la plantilla (independientes del dominio TiendaPro). */
export const ECOMMERCE_TEMPLATE_ROUTES = [
  "/productos",
  "/carrito",
  "/checkout",
  "/admin",
  "/login",
  "/registro",
] as const;
