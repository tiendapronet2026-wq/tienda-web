import type { Permission } from "@/lib/core/types";

export type ModuleId =
  | "venta-online"
  | "stock"
  | "pos"
  | "crm"
  | "chatbot"
  | "delivery"
  | "finanzas"
  | "reportes";

export type ModuleActivationState = "inactive" | "active" | "suspended";

export type ModuleDefinition = {
  id: ModuleId;
  name: string;
  summary: string;
  /** Migración Supabase futura (nombre lógico, no aplicar remoto aún). */
  migrationNamespace: string;
  dependencies: ModuleId[];
  permissions: Permission[];
  /** Ruta panel cuando está activo; null si solo vía API/contrato. */
  panelPath: string | null;
  demoPath: string | null;
  maturity: "scaffold" | "demo" | "production-ready";
};

export const MODULE_REGISTRY: Record<ModuleId, ModuleDefinition> = {
  "venta-online": {
    id: "venta-online",
    name: "Venta online",
    summary: "Catálogo, checkout y pedidos web.",
    migrationNamespace: "mod_venta_online",
    dependencies: [],
    permissions: ["core:read"],
    panelPath: null,
    demoPath: "/demos/tienda",
    maturity: "demo",
  },
  stock: {
    id: "stock",
    name: "Stock",
    summary: "Inventario y movimientos desde venta o POS.",
    migrationNamespace: "mod_stock",
    dependencies: [],
    permissions: ["core:read"],
    panelPath: null,
    demoPath: null,
    maturity: "scaffold",
  },
  pos: {
    id: "pos",
    name: "POS / Caja",
    summary: "Punto de venta; puede emitir movimientos a Stock.",
    migrationNamespace: "mod_pos",
    dependencies: ["stock"],
    permissions: ["core:read"],
    panelPath: null,
    demoPath: "/demos/pos",
    maturity: "demo",
  },
  crm: {
    id: "crm",
    name: "Clientes / CRM",
    summary: "Contactos y pipeline comercial por tenant.",
    migrationNamespace: "mod_crm",
    dependencies: [],
    permissions: ["core:read", "projects:write"],
    panelPath: "/panel/clientes",
    demoPath: null,
    maturity: "scaffold",
  },
  chatbot: {
    id: "chatbot",
    name: "Chatbot",
    summary: "Asistente con capas de reglas; sin canales externos por defecto.",
    migrationNamespace: "mod_chatbot",
    dependencies: [],
    permissions: ["core:read"],
    panelPath: "/panel/agentes",
    demoPath: "/demos/chatbot",
    maturity: "demo",
  },
  delivery: {
    id: "delivery",
    name: "Delivery",
    summary: "Logística y entregas vinculadas a pedidos.",
    migrationNamespace: "mod_delivery",
    dependencies: ["venta-online"],
    permissions: ["core:read"],
    panelPath: null,
    demoPath: null,
    maturity: "scaffold",
  },
  finanzas: {
    id: "finanzas",
    name: "Finanzas",
    summary: "Cobros, cuentas y conciliación (sin cobros reales aún).",
    migrationNamespace: "mod_finanzas",
    dependencies: ["venta-online", "pos"],
    permissions: ["billing:read"],
    panelPath: null,
    demoPath: null,
    maturity: "scaffold",
  },
  reportes: {
    id: "reportes",
    name: "Reportes",
    summary: "Informes operativos y exportación.",
    migrationNamespace: "mod_reportes",
    dependencies: [],
    permissions: ["core:read"],
    panelPath: "/panel/informes",
    demoPath: "/demos/dashboard",
    maturity: "demo",
  },
};

export const moduleList = Object.values(MODULE_REGISTRY);

export function getModule(id: ModuleId): ModuleDefinition {
  return MODULE_REGISTRY[id];
}

export function dependenciesSatisfied(
  moduleId: ModuleId,
  active: Set<ModuleId>
): { ok: boolean; missing: ModuleId[] } {
  const def = MODULE_REGISTRY[moduleId];
  const missing = def.dependencies.filter((d) => !active.has(d));
  return { ok: missing.length === 0, missing };
}
