const DEFAULT_REDIRECT =
  "https://www.tiendapro.net/api/integrations/mercado-pago/callback";

export const MERCADOPAGO_AUTH_URL = "https://auth.mercadopago.com/authorization";
export const MERCADOPAGO_TOKEN_URL = "https://api.mercadopago.com/oauth/token";
export const MERCADOPAGO_USERS_ME_URL = "https://api.mercadopago.com/users/me";

export function getMercadoPagoClientId(): string {
  const id = process.env.MERCADOPAGO_CLIENT_ID?.trim();
  if (!id) throw new Error("MERCADOPAGO_CLIENT_ID no configurado.");
  return id;
}

export function getMercadoPagoClientSecret(): string {
  const secret = process.env.MERCADOPAGO_CLIENT_SECRET?.trim();
  if (!secret) throw new Error("MERCADOPAGO_CLIENT_SECRET no configurado.");
  return secret;
}

export function getMercadoPagoRedirectUri(): string {
  const uri = process.env.MERCADOPAGO_REDIRECT_URI?.trim() || DEFAULT_REDIRECT;
  return uri.replace(/\/$/, "");
}

/** Mínimo para identidad + verificación + refresh (offline_access). Sin permisos de cobro. */
export const MERCADOPAGO_OAUTH_SCOPES = "read offline_access";
