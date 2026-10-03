/** Activar canal Facebook/Messenger (webhook + bot). Default: desactivado. */
export function isFacebookSalesEnabled(): boolean {
  return process.env.TIENDAPRO_FACEBOOK_SALES_ENABLED === "1";
}
