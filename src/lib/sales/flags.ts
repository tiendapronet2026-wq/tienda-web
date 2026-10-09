/** Activar canal Facebook/Messenger (webhook + bot). Default: desactivado. */
export function isFacebookSalesEnabled(): boolean {
  return process.env.TIENDAPRO_FACEBOOK_SALES_ENABLED === "1";
}

/** Activar canal WhatsApp Business Cloud API (webhook + bot). Default: desactivado. */
export function isWhatsAppSalesEnabled(): boolean {
  return process.env.TIENDAPRO_WHATSAPP_SALES_ENABLED === "1";
}
