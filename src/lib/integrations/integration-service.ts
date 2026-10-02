import { createAdminClient } from "@/lib/supabase/admin";
import { createIntegrationConnectClient } from "@/lib/supabase/integration-connect";
import { createClient } from "@/lib/supabase/server";
import {
  decryptCredentialPayload,
  encryptCredentialPayload,
} from "@/lib/integrations/credentials";
import { generateLinkToken, hashLinkToken } from "@/lib/integrations/link-token";
import { getIntegrationProvider } from "@/lib/integrations/providers/registry";
import type { IntegrationProviderId } from "@/lib/integrations/providers/types";

export type SafeConnectionRow = {
  id: string;
  provider: string;
  connection_type: string;
  display_name: string;
  external_account_id: string | null;
  external_account_label: string | null;
  status: string;
  is_active: boolean;
  connected_at: string | null;
  last_verified_at: string | null;
  revoked_at: string | null;
};

export function getPublicSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!url) throw new Error("NEXT_PUBLIC_SITE_URL no configurada.");
  return url.replace(/\/$/, "");
}

export async function startLinkSession(providerId: IntegrationProviderId) {
  const provider = getIntegrationProvider(providerId);
  if (!provider?.isImplemented) {
    throw new Error("Proveedor no disponible.");
  }

  const supabase = await createClient();
  const token = generateLinkToken();
  const tokenHash = hashLinkToken(token);

  const { data, error } = await supabase.rpc("create_integration_link_session", {
    p_provider: providerId,
    p_token_hash: tokenHash,
    p_ttl_seconds: 300,
  });

  if (error) throw new Error(error.message);

  const sessionId = String((data as { session_id: string }).session_id);
  await provider.startAuthorization({
    sessionId,
    provider: providerId,
    requestedByUserId: "",
    tokenHash,
  });

  return { sessionId, token, expiresAt: (data as { expires_at: string }).expires_at };
}

export async function resolveLinkSessionForConnect(token: string) {
  const hash = hashLinkToken(token);
  const connect = createIntegrationConnectClient();
  const { data, error } = await connect.rpc("resolve_integration_link_session_for_connect", {
    p_token_hash: hash,
  });

  if (error || !data || typeof data !== "object") {
    return { valid: false as const, reason: "invalid" };
  }

  const payload = data as Record<string, unknown>;
  if (!payload.valid) {
    const reason = String(payload.reason ?? "invalid");
    return {
      valid: false as const,
      reason: reason as "invalid" | "expired" | "used" | "cancelled",
    };
  }

  const providerId = String(payload.provider ?? "");
  const provider = getIntegrationProvider(providerId);
  if (!provider?.isImplemented) {
    return { valid: false as const, reason: "invalid" };
  }

  return {
    valid: true as const,
    sessionId: String(payload.session_id),
    provider: providerId as IntegrationProviderId,
    providerLabel: provider.displayName,
    expiresAt: String(payload.expires_at),
    requesterLabel: String(payload.requester_label ?? "Administrador"),
    oauthState: payload.oauth_state != null ? String(payload.oauth_state) : null,
  };
}

export async function confirmLinkSession(token: string, oauthState?: string | null) {
  const resolved = await resolveLinkSessionForConnect(token);
  if (!resolved.valid) {
    throw new Error(
      resolved.reason === "expired"
        ? "El enlace expiró."
        : resolved.reason === "used"
          ? "Este enlace ya fue utilizado."
          : "Enlace inválido.",
    );
  }

  if (oauthState && resolved.oauthState && oauthState !== resolved.oauthState) {
    throw new Error("State inválido.");
  }

  const provider = getIntegrationProvider(resolved.provider);
  if (!provider) throw new Error("Proveedor no disponible.");

  const tokenHash = hashLinkToken(token);
  const complete = await provider.completeAuthorization({ tokenHash, oauthState });

  const connect = createIntegrationConnectClient();
  const { data: fin, error: finErr } = await connect.rpc("finalize_integration_link_session", {
    p_token_hash: tokenHash,
    p_display_name: complete.displayName,
    p_external_account_id: complete.externalAccountId,
    p_external_account_label: complete.externalAccountLabel,
    p_connection_type: complete.connectionType,
    p_metadata: complete.metadata,
  });

  if (finErr) throw new Error(finErr.message);

  const connectionId = String((fin as { connection_id: string }).connection_id);

  if (complete.credentialPayload) {
    const { ciphertext, keyVersion } = encryptCredentialPayload(
      JSON.stringify(complete.credentialPayload),
    );
    const { error: credErr } = await connect.rpc("store_integration_connection_credential", {
      p_connection_id: connectionId,
      p_ciphertext: ciphertext,
      p_key_version: keyVersion,
    });
    if (credErr) throw new Error(credErr.message);
  }

  return { connectionId, provider: resolved.provider };
}

export async function listSafeConnections(): Promise<SafeConnectionRow[]> {
  const { listSafeConnections: listFromRpc } = await import(
    "@/lib/integrations/connections-read"
  );
  return listFromRpc();
}

async function loadConnectionAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
  connectionId: string,
) {
  const { data, error } = await supabase.rpc("get_integration_connection_admin", {
    p_connection_id: connectionId,
  });
  if (error) throw new Error(error.message);
  const payload = data as { found?: boolean; provider?: string; status?: string };
  if (!payload?.found) throw new Error("Conexión no encontrada.");
  return payload;
}

export async function verifyConnection(connectionId: string) {
  const supabase = await createClient();
  const row = await loadConnectionAdmin(supabase, connectionId);
  if (row.status !== "connected") throw new Error("La conexión no está activa.");

  const provider = getIntegrationProvider(String(row.provider));
  if (!provider?.isImplemented) throw new Error("Proveedor no implementado.");

  const result = await provider.verifyConnection(connectionId);

  if (result.ok) {
    const { error: updErr } = await supabase.rpc("touch_integration_connection_verified", {
      p_connection_id: connectionId,
    });
    if (updErr) throw new Error(updErr.message);

    const { error: auditErr } = await supabase.rpc("log_integration_audit_event", {
      p_event_type: "connection_verified",
      p_provider: String(row.provider),
      p_connection_id: connectionId,
      p_link_session_id: null,
      p_metadata: { message: result.message ?? null },
    });
    if (auditErr) throw new Error(auditErr.message);
  } else {
    const { error: auditErr } = await supabase.rpc("log_integration_audit_event", {
      p_event_type: "connection_failed",
      p_provider: String(row.provider),
      p_connection_id: connectionId,
      p_link_session_id: null,
      p_metadata: { message: result.message ?? null },
    });
    if (auditErr) throw new Error(auditErr.message);
  }

  return result;
}

export async function revokeConnection(connectionId: string, reason?: string) {
  const supabase = await createClient();
  let providerId: string | null = null;
  try {
    const row = await loadConnectionAdmin(supabase, connectionId);
    providerId = String(row.provider ?? "");
  } catch {
    providerId = null;
  }

  const provider = providerId ? getIntegrationProvider(providerId) : null;
  if (provider?.isImplemented) {
    await provider.revokeConnection(connectionId);
  }

  const { error } = await supabase.rpc("revoke_integration_connection", {
    p_connection_id: connectionId,
    p_reason: reason ?? null,
  });
  if (error) throw new Error(error.message);
}

/** Solo servidor — nunca exponer al cliente. */
export async function readConnectionCredential(connectionId: string): Promise<Record<string, unknown> | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("integration_connection_credentials")
    .select("ciphertext")
    .eq("connection_id", connectionId)
    .maybeSingle();

  if (!data?.ciphertext) return null;
  try {
    return JSON.parse(decryptCredentialPayload(data.ciphertext)) as Record<string, unknown>;
  } catch {
    return null;
  }
}
