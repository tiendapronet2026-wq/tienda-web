import { describe, expect, it } from "vitest";
import { parseWhatsAppCloudWebhookPayload } from "./parse-whatsapp-events";

describe("parseWhatsAppCloudWebhookPayload", () => {
  it("extrae mensaje de texto entrante", () => {
    const result = parseWhatsAppCloudWebhookPayload({
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WABA",
          changes: [
            {
              field: "messages",
              value: {
                messaging_product: "whatsapp",
                metadata: { phone_number_id: "123", display_phone_number: "15550000000" },
                messages: [
                  {
                    from: "5491112345678",
                    id: "wamid.ABC",
                    timestamp: "1699999999",
                    type: "text",
                    text: { body: "Hola, quiero comprar" },
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].externalUserId).toBe("5491112345678");
    expect(result.messages[0].providerMessageId).toBe("wamid.ABC");
    expect(result.messages[0].text).toMatch(/comprar/i);
  });

  it("ignora estados sin mensajes", () => {
    const result = parseWhatsAppCloudWebhookPayload({
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              field: "messages",
              value: {
                messaging_product: "whatsapp",
                statuses: [{ id: "wamid.ABC", status: "delivered" }],
              },
            },
          ],
        },
      ],
    });
    expect(result.messages).toHaveLength(0);
    expect(result.ignored).toBeGreaterThan(0);
  });
});
