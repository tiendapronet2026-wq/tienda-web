import type { PlatformInstallationRow } from "@/lib/platform/installations/types";

export const mockTemplates = [
  {
    templateId: "ecommerce-store-v1",
    name: "Tienda online (ecommerce)",
    description: "Catálogo, carrito, checkout y admin.",
    businessType: "retail",
    status: "available" as const,
    defaultModules: ["venta-online", "stock", "crm", "reportes"],
  },
  {
    templateId: "restaurant-v1",
    name: "Restaurante",
    description: "Próximamente.",
    businessType: "restaurant",
    status: "coming_soon" as const,
    defaultModules: ["pos", "delivery"],
  },
];

export const mockInstallations: PlatformInstallationRow[] = [
  {
    id: "mock-ref-tiendapro",
    tenantId: null,
    companyName: "TiendaPro (referencia demo)",
    companySlug: "tiendapro-reference",
    templateId: "ecommerce-store-v1",
    templateName: "Tienda online (ecommerce)",
    primaryDomain: "www.tiendapro.net",
    environment: "production",
    lifecycleStatus: "live",
    installedVersion: "3.0.0",
    enabledModules: ["venta-online", "stock"],
    githubStatus: "connected",
    vercelStatus: "connected",
    supabaseStatus: "connected",
    githubMeta: { repo: "tiendapronet2026-wq/tienda-web" },
    vercelMeta: { project: "tienda-web" },
    supabaseMeta: { project_ref: "dnptsudsxrcamtxfiszh" },
    brandingConfig: { brand_name: "TiendaPro" },
    isReference: true,
    updatedAt: new Date().toISOString(),
  },
];

export const mockOperations = [
  {
    id: "op-mock-1",
    installationId: "mock-ref-tiendapro",
    operationType: "install.dry_run",
    environment: "production",
    status: "simulated",
    summary: "Simulación de manifiesto (demo)",
    createdAt: new Date().toISOString(),
  },
];
