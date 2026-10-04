import { describe, expect, it } from "vitest";
import { buildMessengerOfferUrl } from "./tracking";

describe("buildMessengerOfferUrl", () => {
  it("COMPRAR genera tracking sin precio en query", () => {
    const url = buildMessengerOfferUrl("https://www.tiendapro.net/oferta/pack-150", "opaque123");
    const parsed = new URL(url);
    expect(parsed.searchParams.get("src")).toBe("facebook_messenger");
    expect(parsed.searchParams.get("cid")).toBe("opaque123");
    expect(parsed.searchParams.has("price")).toBe(false);
  });
});
