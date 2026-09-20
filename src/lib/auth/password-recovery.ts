import type { EmailOtpType } from "@supabase/supabase-js";

export const PASSWORD_UPDATE_PATH = "/actualizar-password";
export const AUTH_CALLBACK_PATH = "/auth/callback";

export function buildPasswordResetRedirectUrl(siteUrl: string): string {
  const base = siteUrl.replace(/\/$/, "");
  const next = encodeURIComponent(PASSWORD_UPDATE_PATH);
  return `${base}${AUTH_CALLBACK_PATH}?next=${next}`;
}

export type RecoveryUrlParams = {
  code: string | null;
  tokenHash: string | null;
  type: EmailOtpType | null;
};

export function parseRecoveryUrlParams(search: string, hash: string): RecoveryUrlParams {
  const query = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const hashParams = new URLSearchParams(hash.replace(/^#/, ""));

  const code = query.get("code") ?? hashParams.get("code");
  const tokenHash = query.get("token_hash") ?? hashParams.get("token_hash");
  const rawType = query.get("type") ?? hashParams.get("type");

  const allowed: EmailOtpType[] = ["recovery", "email", "signup", "invite", "magiclink", "email_change"];
  const type =
    rawType && allowed.includes(rawType as EmailOtpType) ? (rawType as EmailOtpType) : null;

  return { code, tokenHash, type };
}

export function hasImplicitRecoveryTokens(hash: string): boolean {
  const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
  const access = hashParams.get("access_token");
  const refresh = hashParams.get("refresh_token");
  const type = hashParams.get("type");
  return Boolean(access && refresh && type === "recovery");
}

export function sanitizeAuthCallbackNext(nextParam: string | null): string {
  if (!nextParam || !nextParam.startsWith("/") || nextParam.startsWith("//")) {
    return PASSWORD_UPDATE_PATH;
  }
  if (nextParam.includes("://")) {
    return PASSWORD_UPDATE_PATH;
  }
  return nextParam;
}

export function buildAuthCallbackRedirectPath(params: {
  code?: string | null;
  tokenHash?: string | null;
  type?: string | null;
  next?: string;
}): string | null {
  const q = new URLSearchParams();
  if (params.code) q.set("code", params.code);
  if (params.tokenHash) q.set("token_hash", params.tokenHash);
  if (params.type) q.set("type", params.type);
  q.set("next", params.next ?? PASSWORD_UPDATE_PATH);
  if (!params.code && !params.tokenHash) return null;
  return `${AUTH_CALLBACK_PATH}?${q.toString()}`;
}
