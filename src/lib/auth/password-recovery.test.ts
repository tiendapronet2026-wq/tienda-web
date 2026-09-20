import { describe, expect, it } from "vitest";
import {
  buildAuthCallbackRedirectPath,
  buildPasswordResetRedirectUrl,
  hasImplicitRecoveryTokens,
  parseRecoveryUrlParams,
  sanitizeAuthCallbackNext,
} from "@/lib/auth/password-recovery";

describe("password-recovery", () => {
  it("buildPasswordResetRedirectUrl apunta al callback con next", () => {
    expect(buildPasswordResetRedirectUrl("https://www.tiendapro.net")).toBe(
      "https://www.tiendapro.net/auth/callback?next=%2Factualizar-password"
    );
  });

  it("parseRecoveryUrlParams lee code PKCE en query", () => {
    const p = parseRecoveryUrlParams("?code=abc123&type=recovery", "");
    expect(p.code).toBe("abc123");
    expect(p.type).toBe("recovery");
  });

  it("parseRecoveryUrlParams lee token_hash SSR", () => {
    const p = parseRecoveryUrlParams("?token_hash=th&type=recovery", "");
    expect(p.tokenHash).toBe("th");
    expect(p.type).toBe("recovery");
  });

  it("hasImplicitRecoveryTokens detecta hash legacy", () => {
    expect(
      hasImplicitRecoveryTokens("#access_token=a&refresh_token=b&type=recovery")
    ).toBe(true);
    expect(hasImplicitRecoveryTokens("#foo=bar")).toBe(false);
  });

  it("sanitizeAuthCallbackNext rechaza open redirect", () => {
    expect(sanitizeAuthCallbackNext("https://evil.test")).toBe("/actualizar-password");
    expect(sanitizeAuthCallbackNext("/mi-cuenta")).toBe("/mi-cuenta");
  });

  it("buildAuthCallbackRedirectPath preserva code", () => {
    expect(buildAuthCallbackRedirectPath({ code: "x", type: "recovery" })).toContain(
      "/auth/callback?code=x"
    );
  });
});
