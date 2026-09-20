import type { TenantConfig, TenantId } from "@/lib/core/types";
import type { TenantEntitlements } from "@/lib/plans/activation";

export type DemoTenantContext = {
  tenantId: TenantId;
  displayName: string;
  entitlements: TenantEntitlements;
  config: TenantConfig;
};

/** Tenant ficticio para panel y showroom — no es producción. */
export const DEMO_TENANT: DemoTenantContext = {
  tenantId: "tenant_demo_horizonte",
  displayName: "Horizonte Labs (demo)",
  entitlements: {
    tenantId: "tenant_demo_horizonte",
    planId: "growth",
    addOnActivations: ["chatbot"],
    suspended: ["delivery"],
  },
  config: {
    tenantId: "tenant_demo_horizonte",
    locale: "es-AR",
    timezone: "America/Argentina/Buenos_Aires",
    customDomain: null,
    deploymentMode: "shared",
  },
};

export function getDemoTenant(): DemoTenantContext {
  return DEMO_TENANT;
}
