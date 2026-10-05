export function getMercadoPagoWebhookSecret(): string {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new Error("MERCADOPAGO_WEBHOOK_SECRET no configurado.");
  }
  return secret;
}
