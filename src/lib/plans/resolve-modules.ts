import {
  MODULE_REGISTRY,
  rulesSatisfied,
  type ModuleActivationState,
  type ModuleId,
} from "@/lib/modules/registry";
import type { PlanId } from "./catalog";
import { getPlan } from "./catalog";

export type TenantEntitlements = {
  tenantId: string;
  planId: PlanId;
  addOnActivations: ModuleId[];
  suspended: ModuleId[];
};

export type ModuleIntegrationStatus = {
  featureKey: string;
  label: string;
  enabled: boolean;
  reason?: string;
};

export type ResolvedModuleRow = {
  moduleId: ModuleId;
  state: ModuleActivationState;
  contracted: boolean;
  reason?: string;
  integrations: ModuleIntegrationStatus[];
};

export type ResolvedEntitlements = {
  active: ModuleId[];
  catalog: ResolvedModuleRow[];
};

function contractedModules(entitlements: TenantEntitlements): Set<ModuleId> {
  const plan = getPlan(entitlements.planId);
  return new Set<ModuleId>([...plan.includedModules, ...entitlements.addOnActivations]);
}

/** Conjunto efectivamente activo (fixpoint sobre reglas duras, excluye suspendidos). */
export function computeEffectiveActive(contracted: Set<ModuleId>, suspended: Set<ModuleId>): Set<ModuleId> {
  const active = new Set<ModuleId>();
  for (const id of contracted) {
    if (!suspended.has(id)) active.add(id);
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const id of [...active]) {
      const def = MODULE_REGISTRY[id];
      if (!rulesSatisfied(def.requiredRules, active)) {
        active.delete(id);
        changed = true;
      }
    }
  }
  return active;
}

function resolveIntegrations(
  moduleId: ModuleId,
  effective: Set<ModuleId>,
  suspended: Set<ModuleId>
): ModuleIntegrationStatus[] {
  const def = MODULE_REGISTRY[moduleId];
  if (!effective.has(moduleId)) return [];

  return def.optionalIntegrations.map((integration) => {
    if (suspended.has(integration.partnerModuleId)) {
      return {
        featureKey: integration.featureKey,
        label: integration.label,
        enabled: false,
        reason: `Integración pausada: ${integration.partnerModuleId} suspendido`,
      };
    }
    if (!effective.has(integration.partnerModuleId)) {
      return {
        featureKey: integration.featureKey,
        label: integration.label,
        enabled: false,
        reason: `Requiere módulo ${integration.partnerModuleId} activo`,
      };
    }
    return {
      featureKey: integration.featureKey,
      label: integration.label,
      enabled: true,
    };
  });
}

export function resolveEntitlements(entitlements: TenantEntitlements): ResolvedEntitlements {
  const contracted = contractedModules(entitlements);
  const suspended = new Set(entitlements.suspended);
  const effective = computeEffectiveActive(contracted, suspended);

  const catalog = (Object.keys(MODULE_REGISTRY) as ModuleId[]).map((moduleId) => {
    const isContracted = contracted.has(moduleId);
    const integrations = resolveIntegrations(moduleId, effective, suspended);

    if (suspended.has(moduleId) && isContracted) {
      return {
        moduleId,
        state: "suspended" as const,
        contracted: true,
        reason: "Suspendido (datos conservados)",
        integrations: [],
      };
    }

    if (!isContracted) {
      return {
        moduleId,
        state: "inactive" as const,
        contracted: false,
        integrations: [],
      };
    }

    if (!effective.has(moduleId)) {
      const def = MODULE_REGISTRY[moduleId];
      let reason = "Dependencias no satisfechas";
      for (const rule of def.requiredRules) {
        if (rule.kind === "any" && !rule.modules.some((m) => effective.has(m))) {
          reason = `Requiere al menos uno activo: ${rule.modules.join(" | ")}`;
        }
        if (rule.kind === "all") {
          const missing = rule.modules.filter((m) => !effective.has(m));
          if (missing.length) reason = `Requiere: ${missing.join(", ")}`;
        }
      }
      return {
        moduleId,
        state: "inactive" as const,
        contracted: true,
        reason,
        integrations: [],
      };
    }

    return {
      moduleId,
      state: "active" as const,
      contracted: true,
      integrations,
    };
  });

  const active = catalog.filter((c) => c.state === "active").map((c) => c.moduleId);
  return { active, catalog };
}

/** Autorización servidor: ocultar UI no sustituye este check. */
export function isModuleEnabledForTenant(
  entitlements: TenantEntitlements,
  moduleId: ModuleId
): boolean {
  return resolveEntitlements(entitlements).active.includes(moduleId);
}

/** Compat: API anterior */
export function resolveActiveModules(entitlements: TenantEntitlements): {
  active: ModuleId[];
  catalog: { moduleId: ModuleId; state: ModuleActivationState; reason?: string }[];
} {
  const resolved = resolveEntitlements(entitlements);
  return {
    active: resolved.active,
    catalog: resolved.catalog.map(({ moduleId, state, reason }) => ({
      moduleId,
      state,
      reason,
    })),
  };
}

export function isIntegrationEnabled(
  entitlements: TenantEntitlements,
  moduleId: ModuleId,
  featureKey: string
): boolean {
  const row = resolveEntitlements(entitlements).catalog.find((c) => c.moduleId === moduleId);
  return row?.integrations.find((i) => i.featureKey === featureKey)?.enabled ?? false;
}
