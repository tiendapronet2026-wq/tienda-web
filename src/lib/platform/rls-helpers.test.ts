import { describe, expect, it } from "vitest";
import {
  assertTenantIsolation,
  canAccessTenant,
  denyCrossTenantAccess,
  type SessionPlatformContext,
} from "@/lib/platform/rls-helpers";

const tenantA = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const tenantB = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

const memberA: SessionPlatformContext = {
  userId: "u1",
  controlOperator: null,
  memberships: [{ tenantId: tenantA, role: "admin", status: "active" }],
};

const memberB: SessionPlatformContext = {
  userId: "u2",
  controlOperator: null,
  memberships: [{ tenantId: tenantB, role: "viewer", status: "active" }],
};

const control: SessionPlatformContext = {
  userId: "u-control",
  controlOperator: "operator",
  memberships: [],
};

describe("rls-helpers / aislamiento tenant", () => {
  it("miembro A accede a tenant A", () => {
    expect(canAccessTenant(memberA, tenantA)).toBe(true);
  });

  it("miembro A no accede a tenant B", () => {
    expect(canAccessTenant(memberA, tenantB)).toBe(false);
  });

  it("bloquea acceso cruzado A→B", () => {
    expect(denyCrossTenantAccess(memberA, tenantB, tenantA)).toBe(true);
  });

  it("viewer B no escribe en tenant B", () => {
    expect(assertTenantIsolation(memberB, tenantB, "write").allowed).toBe(false);
  });

  it("control operator accede cross-tenant", () => {
    expect(canAccessTenant(control, tenantB)).toBe(true);
    expect(denyCrossTenantAccess(control, tenantA, tenantB)).toBe(false);
  });
});
