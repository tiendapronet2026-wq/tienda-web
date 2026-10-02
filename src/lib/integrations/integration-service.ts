import { createAdminClient } from "@/lib/supabase/admin";
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
  const admin = createAdminClient();

  const { data: row, error } = await admin
    .from("integration_link_sessions")
    .select("id, provider, status, expires_at, requested_by, oauth_state")
    .eq("one_time_token_hash", hash)
    .maybeSingle();

  if (error || !row) return { valid: false as const, reason: "invalid" };

  if (row.status === "cancelled") return { valid: false as const, reason: "cancelled" };
  if (row.status === "completed") return { valid: false as const, reason: "used" };
  if (row.status !== "pending") return { valid: false as const, reason: "invalid" };

  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await admin
      .from("integration_link_sessions")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .eq("id", row.id)
      .eq("status", "pending");
    await admin.rpc("log_integration_audit_event", {
      p_event_type: "link_expired",
      p_provider: row.provider,
      p_connection_id: null,
      p_link_session_id: row.id,
      p_metadata: {},
    });
    return { valid: false as const, reason: "expired" };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", row.requested_by)
    .maybeSingle();

  const requesterLabel = profile
    ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()
    : "Administrador";

  const provider = getIntegrationProvider(row.provider);
  if (!provider?.isImplemented) {
    return { valid: false as const, reason: "invalid" };
  }

  return {
    valid: true as const,
    sessionId: row.id,
    provider: row.provider as IntegrationProviderId,
    providerLabel: provider.displayName,
    expiresAt: row.expires_at,
    requesterLabel,
    oauthState: row.oauth_state,
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

  const admin = createAdminClient();
  const { data: fin, error: finErr } = await admin.rpc("finalize_integration_link_session", {
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
    const { error: credErr } = await admin.from("integration_connection_credentials").upsert({
      connection_id: connectionId,
      ciphertext,
      key_version: keyVersion,
      updated_at: new Date().toISOString(),
    });
    if (credErr) throw new Error(credErr.message);
  }

  return { connectionId, provider: resolved.provider };
}

export async function listSafeConnections(): Promise<SafeConnectionRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("integration_connections")
    .select(
      "id, provider, connection_type, display_name, external_account_id, external_account_label, status, is_active, connected_at, last_verified_at, revoked_at",
    )
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as SafeConnectionRow[];
}

export async function verifyConnection(connectionId: string) {
  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("integration_connections")
    .select("id, provider, status")
    .eq("id", connectionId)
    .maybeSingle();

  if (error || !row) throw new Error("Conexión no encontrada.");
  if (row.status !== "connected") throw new Error("La conexión no está activa.");

  const provider = getIntegrationProvider(row.provider);
  if (!provider?.isImplemented) throw new Error("Proveedor no implementado.");

  const result = await provider.verifyConnection(connectionId);
  const admin = createAdminClient();

  if (result.ok) {
    await admin
      .from("integration_connections")
      .update({ last_verified_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", connectionId);
    await admin.rpc("log_integration_audit_event", {
      p_event_type: "connection_verified",
      p_provider: row.provider,
      p_connection_id: connectionId,
      p_link_session_id: null,
      p_metadata: { message: result.message ?? null },
    });
  } else {
    await admin.rpc("log_integration_audit_event", {
      p_event_type: "connection_failed",
      p_provider: row.provider,
      p_connection_id: connectionId,
      p_link_session_id: null,
      p_metadata: { message: result.message ?? null },
    });
  }

  return result;
}

export async function revokeConnection(connectionId: string, reason?: string) {
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("integration_connections")
    .select("provider")
    .eq("id", connectionId)
    .maybeSingle();

  const provider = row ? getIntegrationProvider(row.provider) : null;
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
