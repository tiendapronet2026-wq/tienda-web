import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/platform/control-owner-guard", () => ({
  requireControlOwner: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/platform/tenant-loader", () => ({
  isTiendaProSupabaseConfigured: vi.fn(() => true),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

vi.mock("@/lib/installer/grants", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/installer/grants")>();
  return {
    ...actual,
    loadActiveInstallationGrant: vi.fn(),
    loadLastCompletedInstallSteps: vi.fn(async () => new Set()),
    manifestMatchesGrant: vi.fn(() => []),
  };
});

vi.mock("@/lib/installer/run", () => ({
  runInstallationPipeline: vi.fn(async () => ({ ok: true, steps: [], manifest: {} })),
}));

vi.mock("@/lib/installer/outcome", () => ({
  classifyInstallationOutcome: vi.fn(() => ({
    pipelineComplete: true,
    lifecycleStatus: "preview_validated",
    summary: "mock",
    isIndependentLive: false,
  })),
}));

import { requireControlOwner } from "@/lib/platform/control-owner-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createInstallationResourceGrant,
  runExistingResourcesInstallation,
} from "@/app/actions/installations";
import { loadActiveInstallationGrant } from "@/lib/installer/grants";

describe("installations privileged actions", () => {
  beforeEach(() => {
    vi.mocked(requireControlOwner).mockReset();
    vi.mocked(createAdminClient).mockReset();
    vi.mocked(loadActiveInstallationGrant).mockReset();
  });

  it("createInstallationResourceGrant rechaza operador (FORBIDDEN)", async () => {
    vi.mocked(requireControlOwner).mockResolvedValue({
      ok: false,
      error: "Solo el propietario",
      code: "FORBIDDEN",
    });

    const fd = new FormData();
    fd.set("installation_id", "00000000-0000-4000-8000-000000000001");
    const res = await createInstallationResourceGrant(fd);

    expect(res.ok).toBe(false);
    expect(createAdminClient).not.toHaveBeenCalled();
    if (!res.ok && "code" in res) expect(res.code).toBe("FORBIDDEN");
  });

  it("runExistingResourcesInstallation rechaza anónimo antes de admin", async () => {
    vi.mocked(requireControlOwner).mockResolvedValue({
      ok: false,
      error: "Sesión requerida",
      code: "UNAUTHENTICATED",
    });

    const fd = new FormData();
    fd.set("installation_id", "00000000-0000-4000-8000-000000000002");
    const res = await runExistingResourcesInstallation(fd);

    expect(res.ok).toBe(false);
    expect(createAdminClient).not.toHaveBeenCalled();
    if (!res.ok && "code" in res) expect(res.code).toBe("UNAUTHENTICATED");
  });

  it("createInstallationResourceGrant no devuelve ok si falla auditoría", async () => {
    vi.mocked(requireControlOwner).mockResolvedValue({
      ok: true,
      userId: "owner-1",
      supabase: {} as never,
    });

    const upsert = vi.fn().mockResolvedValue({ error: null });
    const insert = vi.fn().mockResolvedValue({ error: { message: "insert denied" } });
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "platform_installations") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { company_slug: "demo-co", is_reference: false },
                }),
              }),
            }),
          };
        }
        if (table === "installation_resource_grants") {
          return { upsert };
        }
        if (table === "installation_operations") {
          return { insert };
        }
        return {};
      }),
    } as never);

    const fd = new FormData();
    fd.set("installation_id", "00000000-0000-4000-8000-000000000003");
    fd.set("github_repo", "client-org/client-repo");
    fd.set("vercel_project", "client-vercel");
    fd.set("supabase_ref", "abcdefghijklmnop");

    const res = await createInstallationResourceGrant(fd);
    expect(upsert).toHaveBeenCalled();
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain("Auditoría");
  });
});
