export type SalesBotIntent =
  | "SALUDO"
  | "INFO"
  | "CONTENIDO"
  | "PRECIO"
  | "BONOS"
  | "ENTREGA"
  | "PAGO"
  | "COMPRAR"
  | "YA_PAGUE"
  | "SOPORTE"
  | "HUMANO"
  | "FALLBACK";

export type SalesBotResponderContext = {
  packPriceFormatted: string;
  /** null si el pack no está activo para venta pública */
  offerUrl: string | null;
  productAvailable: boolean;
  consecutiveFallbacks: number;
};

export interface SalesBotResponder {
  classifyIntent(text: string): SalesBotIntent;
  reply(intent: SalesBotIntent, ctx: SalesBotResponderContext): string;
  shouldOfferHandoff(intent: SalesBotIntent, consecutiveFallbacks: number): boolean;
}
