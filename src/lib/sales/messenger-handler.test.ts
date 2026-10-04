import { describe, expect, it, vi } from "vitest";
import type { SalesMessagingProvider } from "@/lib/sales/providers/types";
import { handleIncomingMessengerMessages } from "./messenger-handler";

function mockAdmin(overrides?: {
  inboundDuplicate?: boolean;
  conversation?: Record<string, unknown>;
}) {
  const conversation = {
    id: "conv-1",
    channel: "facebook_messenger",
    external_user_id: "USER1",
    tracking_token: "tok123",
    state: "new",
    handoff_requested: false,
    fallback_count: 0,
    last_message_at: new Date().toISOString(),
    ...overrides?.conversation,
  };

  const inboundInsert = vi.fn().mockResolvedValue(
    overrides?.inboundDuplicate ? { error: { code: "23505" } } : { error: null },
  );

  return {
    from: (table: string) => {
      if (table === "sales_conversations") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: conversation, error: null }),
              }),
              maybeSingle: async () => ({ data: conversation, error: null }),
            }),
          }),
          insert: () => ({
            select: () => ({
              single: async () => ({ data: conversation, error: null }),
            }),
          }),
          update: () => ({
            eq: async () => ({ error: null }),
          }),
        };
      }
      if (table === "sales_messages") {
        return { insert: inboundInsert };
      }
      if (table === "products") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  name: "Pack",
                  slug: "pack-150-cursos-digitales-bonos",
                  price: 29999,
                  is_active: true,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return { select: () => ({ eq: () => ({}) }) };
    },
    inboundInsert,
  };
}

describe("handleIncomingMessengerMessages", () => {
  it("procesa SALUDO y envía respuesta", async () => {
    const sendText = vi.fn().mockResolvedValue({ ok: true });
    const provider: SalesMessagingProvider = {
      channel: "facebook_messenger",
      verifyWebhook: () => ({ ok: false }),
      verifyPostSignature: () => true,
      parseIncomingEvents: () => ({ messages: [], ignored: 0 }),
      sendText,
    };

    const admin = mockAdmin();
    const result = await handleIncomingMessengerMessages(
      admin as never,
      provider,
      [
        {
          externalUserId: "USER1",
          providerMessageId: "mid-1",
          text: "Hola",
          timestamp: 1,
          isEcho: false,
        },
      ],
    );

    expect(result.processed).toBe(1);
    expect(sendText).toHaveBeenCalledOnce();
    expect(sendText.mock.calls[0][0].text).toMatch(/Hola/i);
  });

  it("evento duplicado no duplica respuesta", async () => {
    const sendText = vi.fn().mockResolvedValue({ ok: true });
    const provider: SalesMessagingProvider = {
      channel: "facebook_messenger",
      verifyWebhook: () => ({ ok: false }),
      verifyPostSignature: () => true,
      parseIncomingEvents: () => ({ messages: [], ignored: 0 }),
      sendText,
    };

    const admin = mockAdmin({ inboundDuplicate: true });
    const result = await handleIncomingMessengerMessages(
      admin as never,
      provider,
      [
        {
          externalUserId: "USER1",
          providerMessageId: "mid-dup",
          text: "Hola",
          timestamp: 1,
          isEcho: false,
        },
      ],
    );

    expect(result.duplicates).toBe(1);
    expect(sendText).not.toHaveBeenCalled();
  });
});
