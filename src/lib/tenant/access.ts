import type { Permission } from "@/lib/core/types";
import type { ModuleId } from "@/lib/modules/registry";
import { isModuleEnabledForTenant, type TenantEntitlements } from "@/lib/plans/activation";

const rolePermissions: Record<string, Permission[]> = {
  owner: ["core:read", "core:configure", "modules:activate", "billing:read", "projects:write"],
  admin: ["core:read", "core:configure", "modules:activate", "projects:write"],
  operator: ["core:read", "projects:write"],
  viewer: ["core:read"],
};

/** Evaluación en servidor (mock hasta auth real). */
export function assertModuleAccess(
  entitlements: TenantEntitlements,
  moduleId: ModuleId,
  permission: Permission,
  role: keyof typeof rolePermissions = "admin"
): { allowed: boolean; reason: string } {
  if (!rolePermissions[role]?.includes(permission)) {
    return { allowed: false, reason: "Permiso insuficiente" };
  }
  if (!isModuleEnabledForTenant(entitlements, moduleId)) {
    return { allowed: false, reason: "Módulo inactivo para este tenant" };
  }
  return { allowed: true, reason: "ok" };
}
