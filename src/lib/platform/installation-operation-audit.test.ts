import { describe, expect, it, vi } from "vitest";
import { recordInstallationOperation } from "@/lib/platform/installation-operation-audit";

describe("recordInstallationOperation", () => {
  it("propaga error de insert", async () => {
    const admin = {
      from: vi.fn(() => ({
        insert: vi.fn(async () => ({ error: { message: "rls violation" } })),
      })),
    } as never;

    const r = await recordInstallationOperation(admin, {
      installation_id: "i1",
      operation_type: "test",
      status: "ok",
      summary: "x",
      actor_user_id: "u1",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("Auditoría");
  });
});
