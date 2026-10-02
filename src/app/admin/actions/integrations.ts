"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  buildConnectUrl,
  assertQrPayloadIsSafeUrl,
} from "@/lib/integrations/link-token";
import {
  getPublicSiteUrl,
  revokeConnection,
  startLinkSession,
  verifyConnection,
} from "@/lib/integrations/integration-service";
import type { IntegrationProviderId } from "@/lib/integrations/providers/types";
import { stripSecretsFromObject } from "@/lib/integrations/credentials";

export async function startIntegrationLink(providerId: string) {
  await requireAdmin();
  try {
    const { sessionId, token, expiresAt } = await startLinkSession(providerId as IntegrationProviderId);
    const connectUrl = buildConnectUrl(getPublicSiteUrl(), token);
    assertQrPayloadIsSafeUrl(connectUrl);
    return {
      data: stripSecretsFromObject({
        sessionId,
        connectUrl,
        expiresAt,
      }),
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo iniciar la vinculación." };
  }
}

export async function cancelIntegrationLink(sessionId: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cancel_integration_link_session", {
    p_session_id: sessionId,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/integraciones");
  return { data };
}

export async function pollIntegrationLinkStatus(sessionId: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_integration_link_session_status", {
    p_session_id: sessionId,
  });
  if (error) return { error: error.message };
  return { data: stripSecretsFromObject(data as Record<string, unknown>) };
}

export async function verifyIntegrationConnection(connectionId: string) {
  await requireAdmin();
  try {
    const result = await verifyConnection(connectionId);
    revalidatePath("/admin/integraciones");
    return { data: result };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Verificación fallida." };
  }
}

export async function revokeIntegrationConnection(connectionId: string, reason?: string) {
  await requireAdmin();
  try {
    await revokeConnection(connectionId, reason);
    revalidatePath("/admin/integraciones");
    return { data: { revoked: true } };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo desvincular." };
  }
}
