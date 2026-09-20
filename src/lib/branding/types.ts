export type StoreBrandingConfig = {
  brandName: string;
  tagline: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  contactEmail: string;
  /** TiendaPro plataforma vs tienda cliente clonada */
  platformMode: boolean;
};

export const TIENDAPRO_DEFAULT_BRANDING: StoreBrandingConfig = {
  brandName: "TiendaPro",
  tagline: "Plataforma comercial y operaciones",
  logoUrl: "/brand/icons/logo-tiendapro-icon.png",
  faviconUrl: "/brand/icons/favicon-32.png",
  primaryColor: "#0a8f5c",
  secondaryColor: "#0860e8",
  fontFamily: "var(--font-plus-jakarta)",
  contactEmail: "hola@tiendapro.net",
  platformMode: true,
};
