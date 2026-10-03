import { describe, expect, it } from "vitest";
import { MetaMessengerProvider } from "./meta-messenger-provider";

describe("MetaMessengerProvider", () => {
  it("sendText sin config no expone token", async () => {
    const provider = new MetaMessengerProvider();
    const result = await provider.sendText({ externalUserId: "1", text: "hola" });
    expect(result).toEqual({ ok: false, reason: "meta_not_configured" });
    expect(JSON.stringify(result)).not.toMatch(/token/i);
  });
});
