import { describe, expect, it } from "vitest";
import { generateOAuthState, generatePkceVerifier, pkceChallengeS256 } from "@/lib/integrations/oauth-pkce";

describe("PKCE S256", () => {
  it("generates verifier length within MP bounds", () => {
    const v = generatePkceVerifier();
    expect(v.length).toBeGreaterThanOrEqual(43);
    expect(v.length).toBeLessThanOrEqual(128);
  });

  it("derives stable S256 challenge", () => {
    const v = "test-verifier-fixed-value-43chars-min-ok!!";
    const c1 = pkceChallengeS256(v);
    const c2 = pkceChallengeS256(v);
    expect(c1).toBe(c2);
    expect(c1).not.toContain("+");
    expect(c1).not.toContain("=");
  });

  it("generates oauth state", () => {
    expect(generateOAuthState().length).toBeGreaterThan(16);
  });
});
