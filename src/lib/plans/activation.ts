import type { ModuleActivationState, ModuleId } from "@/lib/modules/registry";
import { dependenciesSatisfied, MODULE_REGISTRY } from "@/lib/modules/registry";
import type { PlanId } from "./catalog";
import { getPlan } from "./catalog";

export type TenantModuleActivation = {
  moduleId: ModuleId;
  state: ModuleActivationState;
  config: Record<string, unknown>;
  activatedAt: string | null;
};

export type TenantEntitlements = {
  tenantId: string;
  planId: PlanId;
  /** Módulos explícitamente activados además del plan. */
  addOnActivations: ModuleId[];
  /** Módulos desactivados sin borrar datos. */
  suspended: ModuleId[];
};

export function resolveActiveModules(entitlements: TenantEntitlements): {
  active: ModuleId[];
  catalog: { moduleId: ModuleId; state: ModuleActivationState; reason?: string }[];
} {
  const plan = getPlan(entitlements.planId);
  const base = new Set<ModuleId>([...plan.includedModules, ...entitlements.addOnActivations]);
  entitlements.suspended.forEach((m) => base.delete(m));

  const catalog = Object.keys(MODULE_REGISTRY).map((id) => {
    const moduleId = id as ModuleId;
    if (entitlements.suspended.includes(moduleId)) {
      return { moduleId, state: "suspended" as const, reason: "Desactivado (datos conservados)" };
    }
    if (!base.has(moduleId)) {
      return { moduleId, state: "inactive" as const };
    }
    const deps = dependenciesSatisfied(moduleId, base);
    if (!deps.ok) {
      return {
        moduleId,
        state: "inactive" as const,
        reason: `Requiere: ${deps.missing.join(", ")}`,
      };
    }
    return { moduleId, state: "active" as const };
  });

  const active = catalog.filter((c) => c.state === "active").map((c) => c.moduleId);
  return { active, catalog };
}

/** Autorización servidor: ocultar UI no sustituye este check. */
export function isModuleEnabledForTenant(
  entitlements: TenantEntitlements,
  moduleId: ModuleId
): boolean {
  return resolveActiveModules(entitlements).active.includes(moduleId);
}
