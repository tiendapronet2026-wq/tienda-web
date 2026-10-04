import { describe, expect, it } from "vitest";
import { parseMetaMessengerWebhookPayload } from "./parse-events";

describe("parseMetaMessengerWebhookPayload", () => {
  it("extrae mensaje de texto", () => {
    const { messages } = parseMetaMessengerWebhookPayload({
      object: "page",
      entry: [
        {
          messaging: [
            {
              sender: { id: "USER1" },
              recipient: { id: "PAGE1" },
              timestamp: 1,
              message: { mid: "m1", text: "Hola" },
            },
          ],
        },
      ],
    });
    expect(messages).toHaveLength(1);
    expect(messages[0].externalUserId).toBe("USER1");
    expect(messages[0].text).toBe("Hola");
  });

  it("ignora echo", () => {
    const { messages, ignored } = parseMetaMessengerWebhookPayload({
      object: "page",
      entry: [
        {
          messaging: [
            {
              sender: { id: "PAGE1" },
              message: { mid: "m2", text: "bot", is_echo: true },
            },
          ],
        },
      ],
    });
    expect(messages).toHaveLength(0);
    expect(ignored).toBeGreaterThan(0);
  });

  it("evento desconocido no rompe", () => {
    const { messages } = parseMetaMessengerWebhookPayload({ foo: "bar" });
    expect(messages).toHaveLength(0);
  });
});
