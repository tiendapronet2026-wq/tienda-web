/** Preparación auth multicliente — sin sesión real en demo pública. */

export type AuthRealm = "control" | "tenant-app";

export type SessionClaims = {
  userId: string;
  realm: AuthRealm;
  /** Tenant SaaS cuando realm === tenant-app */
  tenantId: string | null;
  role: string;
  permissions: string[];
};

/** Futuro: validar cookie/JWT antes de datos reales. Demo routes no usan esto aún. */
export function requireSession(_claims: SessionClaims | null): asserts _claims is SessionClaims {
  if (!_claims) {
    throw new Error("AUTH_REQUIRED");
  }
}

export function assertTenantAccess(claims: SessionClaims, tenantId: string) {
  if (claims.realm !== "tenant-app" || claims.tenantId !== tenantId) {
    throw new Error("TENANT_FORBIDDEN");
  }
}
