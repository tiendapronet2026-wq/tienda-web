import type { SalesBotIntent, SalesBotResponder, SalesBotResponderContext } from "./bot-responder";

const RULES: { intent: SalesBotIntent; patterns: RegExp[] }[] = [
  { intent: "SALUDO", patterns: [/^hola\b/i, /^buen[oa]s?\b/i, /^hey\b/i, /^qué tal/i] },
  { intent: "CONTENIDO", patterns: [/qu[eé]\s+incluye/i, /contenido/i, /categor[ií]as/i, /cursos/i] },
  { intent: "BONOS", patterns: [/bonos?/i] },
  { intent: "PRECIO", patterns: [/cu[aá]nto\s+sale/i, /precio/i, /valor/i, /cuesta/i] },
  { intent: "ENTREGA", patterns: [/c[oó]mo\s+recibo/i, /entrega/i, /acceso/i, /mis\s+compras/i] },
  { intent: "PAGO", patterns: [/c[oó]mo\s+pago/i, /mercado\s*pago/i, /medio\s+de\s+pago/i] },
  { intent: "COMPRAR", patterns: [/quiero\s+comprar/i, /\bcomprar\b/i, /lo\s+quiero/i, /pasame\s+el\s+link/i, /enlace/i] },
  { intent: "YA_PAGUE", patterns: [/ya\s+pagu[eé]/i, /pago\s+hecho/i, /transfer[ií]/i] },
  { intent: "SOPORTE", patterns: [/problema/i, /no\s+funciona/i, /error/i, /ayuda/i] },
  { intent: "HUMANO", patterns: [/persona/i, /humano/i, /asesor/i] },
  { intent: "INFO", patterns: [/info/i, /m[aá]s\s+datos/i, /pack/i] },
];

const UNAVAILABLE =
  "El producto todavía no está disponible para compra. Te avisamos cuando esté activo en Tienda Pro.";

export class RuleBasedResponder implements SalesBotResponder {
  classifyIntent(text: string): SalesBotIntent {
    const t = text.trim();
    if (!t) return "FALLBACK";
    for (const rule of RULES) {
      if (rule.patterns.some((p) => p.test(t))) return rule.intent;
    }
    return "FALLBACK";
  }

  shouldOfferHandoff(intent: SalesBotIntent, consecutiveFallbacks: number): boolean {
    if (intent === "HUMANO" || intent === "SOPORTE") return true;
    return consecutiveFallbacks >= 3;
  }

  reply(intent: SalesBotIntent, ctx: SalesBotResponderContext): string {
    if (this.shouldOfferHandoff(intent, ctx.consecutiveFallbacks) && intent !== "YA_PAGUE") {
      return "Te paso con una persona para que te ayude. Un asesor va a revisar tu consulta.";
    }

    switch (intent) {
      case "SALUDO":
        return "¡Hola! 👋 Te puedo contar qué incluye el Pack +150 Cursos, los bonos, el precio o cómo comprarlo.";
      case "CONTENIDO":
        return "Incluye más de 150 cursos digitales (marketing, diseño, idiomas, tecnología, oficios y más) en un solo pack, sin envío físico.";
      case "BONOS":
        return "Sumás bonos de material comercial y guías para acompañar tu compra. El detalle está en la ficha del pack en Tienda Pro.";
      case "PRECIO":
        if (!ctx.productAvailable) return UNAVAILABLE;
        return `El precio actual es ${ctx.packPriceFormatted}.`;
      case "ENTREGA":
        return "Cuando Mercado Pago confirme el pago, Tienda Pro habilita automáticamente tu acceso en Mis compras.";
      case "PAGO":
        if (!ctx.productAvailable || !ctx.offerUrl) return UNAVAILABLE;
        return `Comprás desde la tienda con el checkout seguro. Link: ${ctx.offerUrl}`;
      case "COMPRAR":
        if (!ctx.productAvailable || !ctx.offerUrl) return UNAVAILABLE;
        return `Genial. Este es el link oficial para comprar: ${ctx.offerUrl}`;
      case "YA_PAGUE":
        return "Cuando Mercado Pago confirme el pago, Tienda Pro habilita automáticamente tu acceso. Revisá Mis compras con la misma cuenta del checkout.";
      case "SOPORTE":
      case "HUMANO":
        return "Te paso con una persona para que te ayude.";
      case "INFO":
        if (!ctx.productAvailable) {
          return "Es el Pack +150 Cursos Digitales + Bonos de Tienda Pro. Todavía no está a la venta pública.";
        }
        return `Pack digital +150 cursos con bonos. Precio actual: ${ctx.packPriceFormatted}.`;
      default:
        return "Te puedo contar qué incluye el Pack +150 Cursos, el precio, los bonos, cómo se entrega o pasarte el enlace para comprar.";
    }
  }
}
