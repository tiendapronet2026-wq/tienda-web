import type { ModuleId } from "@/lib/modules/registry";

export type PlanId = "starter" | "growth" | "enterprise" | "custom";

export type PlanModulePricing = {
  moduleId: ModuleId;
  /** Precio mensual referencia (ARS ficticio). Sin cobro real. */
  monthlyPrice: number;
  included: boolean;
};

export type CommercialPlan = {
  id: PlanId;
  name: string;
  description: string;
  /** Precio base mensual referencia. */
  baseMonthlyPrice: number;
  includedModules: ModuleId[];
  addOnModules: PlanModulePricing[];
  maxUsers: number | "unlimited";
};

export const COMMERCIAL_PLANS: Record<PlanId, CommercialPlan> = {
  starter: {
    id: "starter",
    name: "Starter",
    description: "Primeros pasos con venta web y reportes básicos.",
    baseMonthlyPrice: 89000,
    includedModules: ["venta-online", "reportes"],
    addOnModules: [
      { moduleId: "pos", monthlyPrice: 45000, included: false },
      { moduleId: "stock", monthlyPrice: 35000, included: false },
      { moduleId: "crm", monthlyPrice: 29000, included: false },
    ],
    maxUsers: 5,
  },
  growth: {
    id: "growth",
    name: "Growth",
    description: "Operación retail + CRM para equipos en crecimiento.",
    baseMonthlyPrice: 189000,
    includedModules: ["venta-online", "pos", "stock", "crm", "reportes"],
    addOnModules: [
      { moduleId: "chatbot", monthlyPrice: 55000, included: false },
      { moduleId: "delivery", monthlyPrice: 42000, included: false },
      { moduleId: "finanzas", monthlyPrice: 48000, included: false },
    ],
    maxUsers: 25,
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    description: "Todos los módulos estándar; despliegue dedicado opcional.",
    baseMonthlyPrice: 449000,
    includedModules: [
      "venta-online",
      "stock",
      "pos",
      "crm",
      "chatbot",
      "delivery",
      "finanzas",
      "reportes",
    ],
    addOnModules: [],
    maxUsers: "unlimited",
  },
  custom: {
    id: "custom",
    name: "Custom",
    description: "Composición manual de módulos y precios.",
    baseMonthlyPrice: 0,
    includedModules: [],
    addOnModules: [],
    maxUsers: "unlimited",
  },
};

export function getPlan(planId: PlanId): CommercialPlan {
  return COMMERCIAL_PLANS[planId];
}
