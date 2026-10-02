import {
  getMercadoPagoClientId,
  getMercadoPagoClientSecret,
  getMercadoPagoRedirectUri,
  MERCADOPAGO_AUTH_URL,
  MERCADOPAGO_OAUTH_SCOPES,
  MERCADOPAGO_TOKEN_URL,
  MERCADOPAGO_USERS_ME_URL,
} from "@/lib/integrations/mercadopago/config";

export type MercadoPagoTokenResponse = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
  user_id?: number;
  refresh_token?: string;
  live_mode?: boolean;
};

export type MercadoPagoUser = {
  id: number;
  nickname?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
};

function sanitizeMpError(body: unknown): string {
  if (!body || typeof body !== "object") {
    return "No se pudo completar la vinculación con Mercado Pago.";
  }
  void body;
  return "No se pudo completar la vinculación con Mercado Pago.";
}

export async function exchangeAuthorizationCode(
  code: string,
  codeVerifier: string,
): Promise<MercadoPagoTokenResponse> {
  const res = await fetch(MERCADOPAGO_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      client_id: getMercadoPagoClientId(),
      client_secret: getMercadoPagoClientSecret(),
      grant_type: "authorization_code",
      code,
      redirect_uri: getMercadoPagoRedirectUri(),
      code_verifier: codeVerifier,
    }),
  });
  const body = (await res.json().catch(() => ({}))) as MercadoPagoTokenResponse & {
    message?: string;
    error?: string;
  };
  if (!res.ok || !body.access_token) {
    throw new Error(sanitizeMpError(body));
  }
  return body;
}

export async function refreshMercadoPagoToken(
  refreshToken: string,
): Promise<MercadoPagoTokenResponse> {
  const res = await fetch(MERCADOPAGO_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      client_id: getMercadoPagoClientId(),
      client_secret: getMercadoPagoClientSecret(),
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  const body = (await res.json().catch(() => ({}))) as MercadoPagoTokenResponse;
  if (!res.ok || !body.access_token) {
    throw new Error(sanitizeMpError(body));
  }
  return body;
}

export async function fetchMercadoPagoUser(accessToken: string): Promise<MercadoPagoUser> {
  const res = await fetch(MERCADOPAGO_USERS_ME_URL, {
    headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
  });
  const body = (await res.json().catch(() => ({}))) as MercadoPagoUser;
  if (!res.ok || body.id == null) {
    throw new Error("No se pudo verificar la cuenta de Mercado Pago.");
  }
  return body;
}

export function buildMercadoPagoAuthorizationUrl(params: {
  state: string;
  codeChallenge: string;
}): string {
  const q = new URLSearchParams({
    response_type: "code",
    client_id: getMercadoPagoClientId(),
    redirect_uri: getMercadoPagoRedirectUri(),
    state: params.state,
    code_challenge: params.codeChallenge,
    code_challenge_method: "S256",
  });
  if (MERCADOPAGO_OAUTH_SCOPES) {
    q.set("scope", MERCADOPAGO_OAUTH_SCOPES);
  }
  return `${MERCADOPAGO_AUTH_URL}?${q.toString()}`;
}
