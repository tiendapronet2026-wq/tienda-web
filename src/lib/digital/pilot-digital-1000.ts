import type { CartLine } from "@/lib/checkout/place-order";
import {
  PILOT_DIGITAL_1000_ORDER_MARKER,
  PILOT_DIGITAL_1000_PRICE_ARS,
  PILOT_DIGITAL_1000_SKU,
  PILOT_DIGITAL_1000_SLUG,
} from "@/lib/digital/constants";

export function isPilotDigital1000Enabled(): boolean {
  return process.env.TIENDAPRO_PILOT_DIGITAL_1000_ENABLED === "1";
}

export function isPilotDigital1000Sku(sku: string | null | undefined): boolean {
  return sku === PILOT_DIGITAL_1000_SKU;
}

export function isPilotDigital1000Slug(slug: string | null | undefined): boolean {
  return slug === PILOT_DIGITAL_1000_SLUG;
}

export function cartContainsPilotDigital1000(lines: CartLine[]): boolean {
  return lines.some((line) => isPilotDigital1000Sku(line.products?.sku ?? null));
}

/** Bloquea checkout con producto piloto si el flag está apagado o el precio no es canónico. */
export function assertPilotDigital1000CheckoutAllowed(lines: CartLine[]): void {
  if (!cartContainsPilotDigital1000(lines)) return;

  if (!isPilotDigital1000Enabled()) {
    throw new Error("La compra piloto no está habilitada en este entorno.");
  }

  const pilotLines = lines.filter((line) => isPilotDigital1000Sku(line.products?.sku ?? null));
  const otherLines = lines.filter((line) => !isPilotDigital1000Sku(line.products?.sku ?? null));
  if (otherLines.length > 0) {
    throw new Error("La compra piloto debe realizarse sin otros productos en el carrito.");
  }

  for (const line of pilotLines) {
    const unit = Number(line.products?.price);
    const canonical = PILOT_DIGITAL_1000_PRICE_ARS;
    if (Math.round(unit * 100) !== Math.round(canonical * 100)) {
      throw new Error("Precio del producto piloto inválido. Recargá la página.");
    }
    if (line.quantity !== 1) {
      throw new Error("La compra piloto permite una sola unidad.");
    }
  }
}

export function mergePilotOrderMarker(notes: string | null | undefined): string {
  const marker = PILOT_DIGITAL_1000_ORDER_MARKER;
  if (notes?.includes(marker)) return notes.trim();
  return `${marker} ${notes ?? ""}`.trim();
}
