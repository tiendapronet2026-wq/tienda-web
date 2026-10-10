import { describe, expect, it } from "vitest";
import { RuleBasedResponder } from "./rule-based-responder";

describe("RuleBasedResponder", () => {
  const bot = new RuleBasedResponder();
  const activeCtx = {
    packPriceFormatted: "$ 29.999",
    offerUrl: "https://www.tiendapro.net/oferta/pack-150?src=facebook_messenger&cid=abc",
    productAvailable: true,
    consecutiveFallbacks: 0,
  };
  const inactiveCtx = {
    ...activeCtx,
    productAvailable: false,
    offerUrl: null,
  };

  it("clasifica PRECIO y usa catálogo", () => {
    expect(bot.classifyIntent("¿Cuánto sale?")).toBe("PRECIO");
    expect(bot.reply("PRECIO", activeCtx)).toContain("$ 29.999");
  });

  it("producto inactive no genera checkout", () => {
    expect(bot.reply("COMPRAR", inactiveCtx)).toMatch(/no está disponible/i);
    expect(bot.reply("PRECIO", inactiveCtx)).toMatch(/no está disponible/i);
  });

  it("YA_PAGUE no promete activación manual", () => {
    expect(bot.reply("YA_PAGUE", activeCtx)).toMatch(/Mercado Pago confirme/i);
  });

  it("COMPROBANTE no acredita por captura", () => {
    expect(bot.reply("COMPROBANTE", activeCtx)).toMatch(/No activamos el acceso solo con una captura/i);
  });

  it("HUMANO crea mensaje de handoff", () => {
    expect(bot.classifyIntent("quiero hablar con una persona")).toBe("HUMANO");
    expect(bot.reply("HUMANO", activeCtx)).toMatch(/persona/i);
  });

  it("varios fallback ofrecen humano", () => {
    expect(bot.shouldOfferHandoff("FALLBACK", 3)).toBe(true);
    expect(
      bot.reply("FALLBACK", { ...activeCtx, consecutiveFallbacks: 3 }),
    ).toMatch(/persona/i);
  });

  it("fallback seguro", () => {
    expect(bot.classifyIntent("xyz???")).toBe("FALLBACK");
    expect(bot.reply("FALLBACK", activeCtx)).toMatch(/Pack \+150/);
  });
});
