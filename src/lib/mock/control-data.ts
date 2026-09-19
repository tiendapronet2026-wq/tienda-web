/** Clientes TiendaPro (tenants) — ficticios, capa Control. */

export type ControlTenantRow = {
  id: string;
  name: string;
  plan: string;
  modulesActive: number;
  status: "activo" | "trial" | "pausa";
};

export const controlTenants: ControlTenantRow[] = [
  { id: "tenant_demo_horizonte", name: "Horizonte Labs (demo)", plan: "Growth", modulesActive: 5, status: "activo" },
  { id: "tenant_demo_nova", name: "Nova Retail (demo)", plan: "Starter", modulesActive: 2, status: "trial" },
];

export const controlRequests = [
  { id: "s1", subject: "Alta módulo POS", tenant: "Nova Retail (demo)", status: "pendiente" },
  { id: "s2", subject: "Cambio plan Growth", tenant: "Horizonte Labs (demo)", status: "en revisión" },
];
