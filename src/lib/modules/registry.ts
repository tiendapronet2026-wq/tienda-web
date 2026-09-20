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

/** Etiqueta pública de madurez (showroom / catálogo). */
export type ModuleShowcaseStatus = "demo" | "functional" | "coming-soon";

export type DependencyRule =
  | { kind: "all"; modules: ModuleId[] }
  | { kind: "any"; modules: ModuleId[] };

export type OptionalIntegrationDef = {
  featureKey: string;
  partnerModuleId: ModuleId;
  label: string;
};

export type ModuleDefinition = {
  id: ModuleId;
  name: string;
  summary: string;
  migrationNamespace: string;
  /** Reglas duras para activar el módulo (evaluadas contra módulos efectivamente activos). */
  requiredRules: DependencyRule[];
  /** Integraciones mejoradas cuando el partner también está activo (no bloquean activación). */
  optionalIntegrations: OptionalIntegrationDef[];
  permissions: Permission[];
  panelPath: string | null;
  demoPath: string | null;
  maturity: "scaffold" | "demo" | "production-ready";
  showcaseStatus: ModuleShowcaseStatus;
};

export const MODULE_REGISTRY: Record<ModuleId, ModuleDefinition> = {
  "venta-online": {
    id: "venta-online",
    name: "Venta online",
    summary: "Catálogo, checkout y pedidos web.",
    migrationNamespace: "mod_venta_online",
    requiredRules: [],
    optionalIntegrations: [
      {
        featureKey: "venta-stock-sync",
        partnerModuleId: "stock",
        label: "Descuenta stock al confirmar pedidos web",
      },
    ],
    permissions: ["core:read"],
    panelPath: null,
    demoPath: "/demos/tienda",
    maturity: "demo",
    showcaseStatus: "demo",
  },
  stock: {
    id: "stock",
    name: "Stock",
    summary: "Inventario central; opcional para POS y venta web.",
    migrationNamespace: "mod_stock",
    requiredRules: [],
    optionalIntegrations: [],
    permissions: ["core:read"],
    panelPath: null,
    demoPath: null,
    maturity: "scaffold",
    showcaseStatus: "coming-soon",
  },
  pos: {
    id: "pos",
    name: "POS / Caja",
    summary: "Punto de venta autónomo o integrado con stock.",
    migrationNamespace: "mod_pos",
    requiredRules: [],
    optionalIntegrations: [
      {
        featureKey: "pos-stock-sync",
        partnerModuleId: "stock",
        label: "Actualiza inventario al cerrar tickets",
      },
    ],
    permissions: ["core:read"],
    panelPath: null,
    demoPath: "/demos/pos",
    maturity: "demo",
    showcaseStatus: "demo",
  },
  crm: {
    id: "crm",
    name: "Clientes / CRM",
    summary: "Contactos del tenant (no confundir con clientes TiendaPro en Control).",
    migrationNamespace: "mod_crm",
    requiredRules: [],
    optionalIntegrations: [],
    permissions: ["core:read", "projects:write"],
    panelPath: "/app/clientes",
    demoPath: null,
    maturity: "scaffold",
    showcaseStatus: "coming-soon",
  },
  chatbot: {
    id: "chatbot",
    name: "Chatbot",
    summary: "Asistente con capas de reglas; sin canales externos por defecto.",
    migrationNamespace: "mod_chatbot",
    requiredRules: [],
    optionalIntegrations: [],
    permissions: ["core:read"],
    panelPath: "/app/asistente",
    demoPath: "/demos/chatbot",
    maturity: "demo",
    showcaseStatus: "demo",
  },
  delivery: {
    id: "delivery",
    name: "Delivery",
    summary: "Logística vinculada a pedidos web.",
    migrationNamespace: "mod_delivery",
    requiredRules: [{ kind: "all", modules: ["venta-online"] }],
    optionalIntegrations: [],
    permissions: ["core:read"],
    panelPath: null,
    demoPath: null,
    maturity: "scaffold",
    showcaseStatus: "coming-soon",
  },
  finanzas: {
    id: "finanzas",
    name: "Finanzas",
    summary: "Conciliación desde venta web y/o POS (al menos una fuente activa).",
    migrationNamespace: "mod_finanzas",
    requiredRules: [{ kind: "any", modules: ["venta-online", "pos"] }],
    optionalIntegrations: [
      {
        featureKey: "finanzas-stock-valuation",
        partnerModuleId: "stock",
        label: "Valuación de inventario en reportes financieros",
      },
    ],
    permissions: ["billing:read"],
    panelPath: null,
    demoPath: null,
    maturity: "scaffold",
    showcaseStatus: "coming-soon",
  },
  reportes: {
    id: "reportes",
    name: "Reportes",
    summary: "Informes operativos y exportación.",
    migrationNamespace: "mod_reportes",
    requiredRules: [],
    optionalIntegrations: [],
    permissions: ["core:read"],
    panelPath: "/app/informes",
    demoPath: "/demos/dashboard",
    maturity: "demo",
    showcaseStatus: "demo",
  },
};

export const moduleList = Object.values(MODULE_REGISTRY);

export function getModule(id: ModuleId): ModuleDefinition {
  return MODULE_REGISTRY[id];
}

export function rulesSatisfied(rules: DependencyRule[], active: Set<ModuleId>): boolean {
  if (rules.length === 0) return true;
  return rules.every((rule) => {
    if (rule.kind === "all") {
      return rule.modules.every((m) => active.has(m));
    }
    return rule.modules.some((m) => active.has(m));
  });
}

/** @deprecated Usar resolveEntitlements — compatibilidad tests antiguos */
export function dependenciesSatisfied(
  moduleId: ModuleId,
  active: Set<ModuleId>
): { ok: boolean; missing: ModuleId[] } {
  const def = MODULE_REGISTRY[moduleId];
  const ok = rulesSatisfied(def.requiredRules, active);
  if (ok) return { ok: true, missing: [] };
  const missing: ModuleId[] = [];
  for (const rule of def.requiredRules) {
    if (rule.kind === "all") {
      missing.push(...rule.modules.filter((m) => !active.has(m)));
    } else if (!rule.modules.some((m) => active.has(m))) {
      missing.push(...rule.modules);
    }
  }
  return { ok: false, missing: [...new Set(missing)] };
}
