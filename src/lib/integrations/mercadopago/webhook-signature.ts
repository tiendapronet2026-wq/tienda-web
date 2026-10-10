import { createHmac, timingSafeEqual } from "node:crypto";

export type ParsedSignature = { ts: string; v1: string };

export function parseMercadoPagoSignatureHeader(header: string | null): ParsedSignature | null {
  if (!header?.trim()) return null;
  let ts: string | null = null;
  let v1: string | null = null;
  for (const part of header.split(",")) {
    const [k, v] = part.split("=").map((s) => s.trim());
    if (k === "ts") ts = v ?? null;
    if (k === "v1") v1 = v ?? null;
  }
  if (!ts || !v1) return null;
  return { ts, v1 };
}

export function buildMercadoPagoWebhookManifest(params: {
  dataId: string | null;
  xRequestId: string | null;
  ts: string;
}): string {
  const parts: string[] = [];
  if (params.dataId) parts.push(`id:${params.dataId.toLowerCase()};`);
  if (params.xRequestId) parts.push(`request-id:${params.xRequestId};`);
  parts.push(`ts:${params.ts};`);
  return parts.join("");
}

export function verifyMercadoPagoWebhookSignature(params: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
  secret: string;
}): boolean {
  const parsed = parseMercadoPagoSignatureHeader(params.xSignature);
  if (!parsed) return false;

  const manifest = buildMercadoPagoWebhookManifest({
    dataId: params.dataId,
    xRequestId: params.xRequestId,
    ts: parsed.ts,
  });

  const expected = createHmac("sha256", params.secret).update(manifest).digest("hex");
  const received = parsed.v1;
  if (expected.length !== received.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}
