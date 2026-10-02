import { describe, expect, it } from "vitest";
import {
  assertQrPayloadIsSafeUrl,
  buildConnectUrl,
  generateLinkToken,
  hashLinkToken,
} from "./link-token";

describe("Gate 3F link token", () => {
  it("genera hash estable", () => {
    const t = "abc";
    expect(hashLinkToken(t)).toBe(hashLinkToken(t));
    expect(hashLinkToken(t)).not.toBe(hashLinkToken("abd"));
  });

  it("QR URL no contiene secretos", () => {
    const token = generateLinkToken();
    const url = buildConnectUrl("https://tiendapro.net", token);
    expect(url).toMatch(/^https:\/\/tiendapro\.net\/connect\//);
    assertQrPayloadIsSafeUrl(url);
    expect(url).not.toMatch(/client_secret|access_token/i);
  });

  it("rechaza payloads con secretos", () => {
    expect(() => assertQrPayloadIsSafeUrl("https://x?access_token=1")).toThrow();
  });
});
