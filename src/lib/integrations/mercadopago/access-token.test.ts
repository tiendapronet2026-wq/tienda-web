import { describe, expect, it, vi } from "vitest";
import { getActiveMercadoPagoConnectionId } from "@/lib/integrations/mercadopago/access-token";

describe("getActiveMercadoPagoConnectionId", () => {
  it("prefiere RPC security definer antes del SELECT directo", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: "conn-rpc-1", error: null });
    const maybeSingle = vi.fn();
    const admin = {
      rpc,
      from: vi.fn(() => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle,
                  }),
                }),
              }),
            }),
          }),
        }),
      })),
    };

    const id = await getActiveMercadoPagoConnectionId(admin as never);
    expect(id).toBe("conn-rpc-1");
    expect(rpc).toHaveBeenCalledWith("get_active_integration_connection_id", {
      p_provider: "mercadopago",
    });
    expect(maybeSingle).not.toHaveBeenCalled();
  });

  it("usa SELECT directo si el RPC no devuelve id", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: "missing fn" } });
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: "conn-table-1" }, error: null });
    const admin = {
      rpc,
      from: vi.fn(() => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle,
                  }),
                }),
              }),
            }),
          }),
        }),
      })),
    };

    const id = await getActiveMercadoPagoConnectionId(admin as never);
    expect(id).toBe("conn-table-1");
  });
});
