import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { readConnectionCredential } from "@/lib/integrations/integration-service";
import type { MercadoPagoCredentialPayload } from "@/lib/integrations/providers/mercadopago";
import { mercadoPagoProvider } from "@/lib/integrations/providers/mercadopago";

const REFRESH_SKEW_MS = 60_000;

export async function getActiveMercadoPagoConnectionId(
  admin: SupabaseClient = createAdminClient(),
): Promise<string | null> {
  const { data: rpcId, error: rpcError } = await admin.rpc("get_active_integration_connection_id", {
    p_provider: "mercadopago",
  });

  if (!rpcError && rpcId) {
    return String(rpcId);
  }

  const { data, error } = await admin
    .from("integration_connections")
    .select("id")
    .eq("provider", "mercadopago")
    .eq("status", "connected")
    .eq("is_active", true)
    .order("connected_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (error || !data?.id) return null;
  return data.id;
}

function tokenNeedsRefresh(cred: MercadoPagoCredentialPayload): boolean {
  if (!cred.expires_at) return false;
  const expires = Date.parse(cred.expires_at);
  if (!Number.isFinite(expires)) return false;
  return expires - Date.now() <= REFRESH_SKEW_MS;
}

export async function getMercadoPagoOAuthAccessToken(connectionId: string): Promise<string> {
  let cred = (await readConnectionCredential(connectionId)) as MercadoPagoCredentialPayload | null;
  if (!cred?.access_token) {
    throw new Error("Sin credenciales OAuth de Mercado Pago.");
  }

  if (cred.refresh_token && tokenNeedsRefresh(cred)) {
    if (!mercadoPagoProvider.refreshCredentials) {
      throw new Error("Refresh de Mercado Pago no disponible.");
    }
    await mercadoPagoProvider.refreshCredentials(connectionId);
    cred = (await readConnectionCredential(connectionId)) as MercadoPagoCredentialPayload | null;
  }

  if (!cred?.access_token) {
    throw new Error("No se pudo obtener access token de Mercado Pago.");
  }

  return cred.access_token;
}
