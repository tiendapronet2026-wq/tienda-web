import {
  exchangeAuthorizationCode,
  fetchMercadoPagoUser,
  refreshMercadoPagoToken,
} from "@/lib/integrations/mercadopago/client";
import { attachLinkSessionOAuth, decryptPkceVerifier } from "@/lib/integrations/link-oauth";
import { generateOAuthState, generatePkceVerifier, pkceChallengeS256 } from "@/lib/integrations/oauth-pkce";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptCredentialPayload } from "@/lib/integrations/credentials";
import type {
  AuthorizationCompleteInput,
  AuthorizationCompleteResult,
  AuthorizationStartResult,
  IntegrationProvider,
  VerifyConnectionResult,
} from "@/lib/integrations/providers/types";

export type MercadoPagoCredentialPayload = {
  type: "mercadopago_oauth";
  access_token: string;
  refresh_token?: string;
  expires_at?: string;
  scope?: string;
  user_id: number;
  live_mode?: boolean;
};

export const mercadoPagoProvider: IntegrationProvider = {
  id: "mercadopago",
  displayName: "Mercado Pago",
  connectionType: "oauth",
  isImplemented: true,
  usesOAuthRedirect: true,

  async startAuthorization(ctx): Promise<AuthorizationStartResult> {
    const state = generateOAuthState();
    const verifier = generatePkceVerifier();
    const challenge = pkceChallengeS256(verifier);
    await attachLinkSessionOAuth(ctx.sessionId, state, challenge, verifier);
    return {};
  },

  async completeAuthorization(input: AuthorizationCompleteInput): Promise<AuthorizationCompleteResult> {
    if (!input.oauthCode || !input.pkceVerifierCiphertext) {
      throw new Error("No se pudo completar la vinculación con Mercado Pago.");
    }
    const verifier = decryptPkceVerifier(input.pkceVerifierCiphertext);
    const tokens = await exchangeAuthorizationCode(input.oauthCode, verifier);
    const user = await fetchMercadoPagoUser(tokens.access_token);
    const expiresAt =
      tokens.expires_in != null
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : undefined;

    const label =
      user.nickname?.trim() ||
      [user.first_name, user.last_name].filter(Boolean).join(" ").trim() ||
      `Cuenta MP ····${String(user.id).slice(-4)}`;

    return {
      displayName: "Mercado Pago",
      externalAccountId: String(user.id),
      externalAccountLabel: label,
      connectionType: "oauth",
      metadata: {
        mp_user_id: user.id,
        nickname: user.nickname ?? null,
        scope: tokens.scope ?? null,
        token_expires_at: expiresAt ?? null,
        live_mode: tokens.live_mode ?? null,
        gate: "3g",
      },
      credentialPayload: {
        type: "mercadopago_oauth",
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
        scope: tokens.scope,
        user_id: user.id,
        live_mode: tokens.live_mode,
      },
    };
  },

  async verifyConnection(connectionId: string): Promise<VerifyConnectionResult> {
    const { readConnectionCredential } = await import("@/lib/integrations/integration-service");
    const cred = (await readConnectionCredential(connectionId)) as MercadoPagoCredentialPayload | null;
    if (!cred?.access_token) {
      return { ok: false, message: "Sin credenciales de Mercado Pago." };
    }
    try {
      const user = await fetchMercadoPagoUser(cred.access_token);
      if (cred.user_id && user.id !== cred.user_id) {
        return { ok: false, message: "La cuenta no coincide con la vinculada." };
      }
      return { ok: true, message: "Token y cuenta Mercado Pago válidos." };
    } catch {
      return { ok: false, message: "Token inválido o expirado." };
    }
  },

  async revokeConnection(connectionId: string): Promise<void> {
    void connectionId;
    /* Mercado Pago no expone revocación OAuth documentada para este flujo; revoke local en RPC. */
  },

  async refreshCredentials(connectionId: string): Promise<void> {
    const { readConnectionCredential } = await import("@/lib/integrations/integration-service");
    const cred = (await readConnectionCredential(connectionId)) as MercadoPagoCredentialPayload | null;
    if (!cred?.refresh_token) {
      throw new Error("No hay refresh token para Mercado Pago.");
    }
    const tokens = await refreshMercadoPagoToken(cred.refresh_token);
    const expiresAt =
      tokens.expires_in != null
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : cred.expires_at;

    const next: MercadoPagoCredentialPayload = {
      ...cred,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? cred.refresh_token,
      expires_at: expiresAt,
      scope: tokens.scope ?? cred.scope,
      user_id: tokens.user_id ?? cred.user_id,
      live_mode: tokens.live_mode ?? cred.live_mode,
    };

    const { ciphertext, keyVersion } = encryptCredentialPayload(JSON.stringify(next));
    const admin = createAdminClient();
    const { error } = await admin.rpc("store_integration_connection_credential", {
      p_connection_id: connectionId,
      p_ciphertext: ciphertext,
      p_key_version: keyVersion,
    });
    if (error) throw new Error(error.message);
  },
};
