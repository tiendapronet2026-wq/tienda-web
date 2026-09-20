import { describe, expect, it } from "vitest";
import type { ModuleId } from "@/lib/modules/registry";
import type { PlanId } from "@/lib/plans/catalog";
import { resolveEntitlements } from "@/lib/plans/resolve-modules";
import type { TenantEntitlements } from "@/lib/plans/resolve-modules";

function ent(partial: Partial<TenantEntitlements> & { planId: PlanId }): TenantEntitlements {
  return {
    tenantId: "t-test",
    addOnActivations: [],
    suspended: [],
    ...partial,
  };
}

describe("resolveEntitlements", () => {
  it("activa POS sin stock", () => {
    const { active } = resolveEntitlements(ent({ planId: "custom", addOnActivations: ["pos"] }));
    expect(active).toContain("pos");
    expect(active).not.toContain("stock");
  });

  it("activa POS + stock con integración", () => {
    const r = resolveEntitlements(ent({ planId: "custom", addOnActivations: ["pos", "stock"] }));
    expect(r.active).toEqual(expect.arrayContaining(["pos", "stock"]));
    const pos = r.catalog.find((c) => c.moduleId === "pos")!;
    expect(pos.integrations.find((i) => i.featureKey === "pos-stock-sync")?.enabled).toBe(true);
  });

  it("finanzas con solo POS", () => {
    const { active } = resolveEntitlements(
      ent({ planId: "custom", addOnActivations: ["pos", "finanzas"] as ModuleId[] })
    );
    expect(active).toEqual(expect.arrayContaining(["pos", "finanzas"]));
  });

  it("finanzas con solo venta online", () => {
    const { active } = resolveEntitlements(
      ent({ planId: "custom", addOnActivations: ["venta-online", "finanzas"] })
    );
    expect(active).toEqual(expect.arrayContaining(["venta-online", "finanzas"]));
  });

  it("suspende integración stock al suspender stock, POS sigue activo", () => {
    const r = resolveEntitlements(
      ent({
        planId: "custom",
        addOnActivations: ["pos", "stock"],
        suspended: ["stock"],
      })
    );
    expect(r.active).toContain("pos");
    expect(r.active).not.toContain("stock");
    const sync = r.catalog.find((c) => c.moduleId === "pos")!.integrations[0];
    expect(sync.enabled).toBe(false);
  });

  it("delivery inactivo si venta online suspendida", () => {
    const { active } = resolveEntitlements(
      ent({
        planId: "custom",
        addOnActivations: ["venta-online", "delivery"],
        suspended: ["venta-online"],
      })
    );
    expect(active).not.toContain("delivery");
  });

  it("finanzas contratada sin fuente queda inactive", () => {
    const row = resolveEntitlements(ent({ planId: "custom", addOnActivations: ["finanzas"] })).catalog.find(
      (c) => c.moduleId === "finanzas"
    )!;
    expect(row.state).toBe("inactive");
  });
});
