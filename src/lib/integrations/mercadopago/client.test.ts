import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildMercadoPagoAuthorizationUrl,
  exchangeAuthorizationCode,
} from "@/lib/integrations/mercadopago/client";

describe("Mercado Pago OAuth client", () => {
  beforeEach(() => {
    process.env.MERCADOPAGO_CLIENT_ID = "test-client-id";
    process.env.MERCADOPAGO_CLIENT_SECRET = "test-client-secret";
    process.env.MERCADOPAGO_REDIRECT_URI =
      "https://www.tiendapro.net/api/integrations/mercado-pago/callback";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.MERCADOPAGO_CLIENT_ID;
    delete process.env.MERCADOPAGO_CLIENT_SECRET;
    delete process.env.MERCADOPAGO_REDIRECT_URI;
  });

  it("builds authorization URL with PKCE S256 and redirect_uri", () => {
    const url = buildMercadoPagoAuthorizationUrl({
      state: "state-abc",
      codeChallenge: "challenge-xyz",
    });
    const parsed = new URL(url);
    expect(parsed.origin).toBe("https://auth.mercadopago.com");
    expect(parsed.searchParams.get("response_type")).toBe("code");
    expect(parsed.searchParams.get("client_id")).toBe("test-client-id");
    expect(parsed.searchParams.get("redirect_uri")).toBe(
      "https://www.tiendapro.net/api/integrations/mercado-pago/callback",
    );
    expect(parsed.searchParams.get("code_challenge_method")).toBe("S256");
    expect(parsed.searchParams.get("code_challenge")).toBe("challenge-xyz");
    expect(parsed.searchParams.get("state")).toBe("state-abc");
    expect(url).not.toContain("secret");
  });

  it("exchanges authorization code server-side without leaking in errors", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: "at-test",
        refresh_token: "rt-test",
        expires_in: 3600,
        user_id: 123,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const tokens = await exchangeAuthorizationCode("auth-code", "verifier-test");
    expect(tokens.access_token).toBe("at-test");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.mercadopago.com/oauth/token",
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    expect(body.grant_type).toBe("authorization_code");
    expect(body.code_verifier).toBe("verifier-test");
    expect(body.client_secret).toBe("test-client-secret");
  });

  it("sanitizes token exchange errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ message: "raw secret leak access_token=xxx" }),
      }),
    );
    await expect(exchangeAuthorizationCode("c", "v")).rejects.toThrow(
      "No se pudo completar la vinculación con Mercado Pago.",
    );
  });
});
