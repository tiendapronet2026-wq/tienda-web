import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/platform/session-platform", () => ({
  loadSessionPlatformContext: vi.fn(),
}));

vi.mock("@/lib/platform/tenant-loader", () => ({
  isTiendaProSupabaseConfigured: vi.fn(() => true),
}));

import { createClient } from "@/lib/supabase/server";
import { loadSessionPlatformContext } from "@/lib/platform/session-platform";
import { requireControlOwner, isControlOwnerRole } from "@/lib/platform/control-owner-guard";

describe("requireControlOwner", () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset();
    vi.mocked(loadSessionPlatformContext).mockReset();
  });

  it("rechaza anónimo", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null } }) },
    } as never);
    const r = await requireControlOwner();
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("UNAUTHENTICATED");
  });

  it("rechaza operador no propietario", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
      rpc: vi.fn(),
    } as never);
    vi.mocked(loadSessionPlatformContext).mockResolvedValue({
      userId: "u1",
      controlOperator: "operator",
      memberships: [],
    });
    const r = await requireControlOwner();
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("FORBIDDEN");
  });

  it("rechaza owner en tabla pero RPC is_control_owner false", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
      rpc: vi.fn(async () => ({ data: false, error: null })),
    } as never);
    vi.mocked(loadSessionPlatformContext).mockResolvedValue({
      userId: "u1",
      controlOperator: "owner",
      memberships: [],
    });
    const r = await requireControlOwner();
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("FORBIDDEN");
  });

  it("acepta propietario con RPC is_control_owner true", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "owner-1" } } }) },
      rpc: vi.fn(async () => ({ data: true, error: null })),
    } as never);
    vi.mocked(loadSessionPlatformContext).mockResolvedValue({
      userId: "owner-1",
      controlOperator: "owner",
      memberships: [],
    });
    const r = await requireControlOwner();
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.userId).toBe("owner-1");
  });
});

describe("isControlOwnerRole", () => {
  it("distingue owner de operator", () => {
    expect(isControlOwnerRole({ controlOperator: "owner" })).toBe(true);
    expect(isControlOwnerRole({ controlOperator: "operator" })).toBe(false);
    expect(isControlOwnerRole({ controlOperator: null })).toBe(false);
  });
});
