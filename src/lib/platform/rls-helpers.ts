/**
 * Comprobaciones de autorización espejo de RLS (servidor app).
 * Usar junto con Supabase client autenticado; no sustituye RLS en BD.
 */

export type TenantMembershipRole = "owner" | "admin" | "operator" | "viewer";
export type ControlOperatorRole = "owner" | "operator" | "viewer";

export type SessionPlatformContext = {
  userId: string;
  controlOperator: ControlOperatorRole | null;
  memberships: Array<{
    tenantId: string;
    role: TenantMembershipRole;
    status: "active" | "suspended";
  }>;
};

export function canAccessTenant(
  ctx: SessionPlatformContext,
  tenantId: string,
  roles?: TenantMembershipRole[]
): boolean {
  if (ctx.controlOperator) return true;
  const m = ctx.memberships.find((x) => x.tenantId === tenantId && x.status === "active");
  if (!m) return false;
  if (!roles) return true;
  return roles.includes(m.role);
}

export function assertTenantIsolation(
  ctx: SessionPlatformContext,
  tenantId: string,
  action: "read" | "write"
): { allowed: boolean; reason: string } {
  if (ctx.controlOperator) {
    return { allowed: true, reason: "control_operator" };
  }
  const writeRoles: TenantMembershipRole[] = action === "write" ? ["owner", "admin", "operator"] : [];
  const ok = canAccessTenant(ctx, tenantId, action === "write" ? writeRoles : undefined);
  if (!ok) {
    return { allowed: false, reason: "TENANT_FORBIDDEN" };
  }
  return { allowed: true, reason: "member" };
}

/** Un tenant no puede leer filas de otro tenant (test de regla de negocio). */
export function denyCrossTenantAccess(
  ctx: SessionPlatformContext,
  resourceTenantId: string,
  sessionTenantId: string
): boolean {
  if (ctx.controlOperator) return false;
  if (resourceTenantId !== sessionTenantId) return true;
  return !canAccessTenant(ctx, sessionTenantId);
}
