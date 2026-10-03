import { describe, expect, it } from "vitest";
import { resolveDigitalAccessForEntitlement } from "./access";

describe("resolveDigitalAccessForEntitlement", () => {
  it("usuario A no accede entitlement de B", async () => {
    const admin = {
      from: (table: string) => {
        if (table === "digital_entitlements") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: "e1",
                    status: "active",
                    product_id: "p1",
                    user_id: "user-b",
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: () => ({ eq: () => ({}) }) };
      },
    };

    const r = await resolveDigitalAccessForEntitlement(admin as never, "e1", "user-a");
    expect(r).toEqual({ ok: false, reason: "not_entitled" });
  });

  it("entitlement revoked no accede", async () => {
    const admin = {
      from: (table: string) => {
        if (table === "digital_entitlements") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: "e1",
                    status: "revoked",
                    product_id: "p1",
                    user_id: "user-a",
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: () => ({ eq: () => ({}) }) };
      },
    };

    const r = await resolveDigitalAccessForEntitlement(admin as never, "e1", "user-a");
    expect(r).toEqual({ ok: false, reason: "not_entitled" });
  });

  it("no expone drive id sin entitlement activo", async () => {
    const admin = {
      from: (table: string) => {
        if (table === "digital_entitlements") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: "e1",
                    status: "active",
                    product_id: "p1",
                    user_id: "user-a",
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "digital_delivery_resources") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  order: () => ({
                    limit: () => ({
                      maybeSingle: async () => ({
                        data: {
                          label: "Pack",
                          external_resource_id: "SECRET_FOLDER_ID",
                          active: true,
                          provider: "google_drive",
                        },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return { select: () => ({ eq: () => ({}) }) };
      },
    };

    const r = await resolveDigitalAccessForEntitlement(admin as never, "e1", "user-a");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.accessUrl).toContain("drive.google.com");
      expect(r.accessUrl).toContain("SECRET_FOLDER_ID");
    }
  });
});
