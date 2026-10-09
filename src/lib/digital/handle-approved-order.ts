import type { SupabaseClient } from "@supabase/supabase-js";
import { syncSalesConversationPurchase } from "@/lib/sales/checkout-attribution";

export type HandleApprovedOrderResult =
  | { ok: true; entitlementsCreated: number; entitlementsActivated: number }
  | { ok: false; reason: string };

type RpcPayload = {
  ok: boolean;
  reason?: string;
  entitlementsCreated?: number;
  entitlementsActivated?: number;
};

/**
 * Idempotente: advisory lock + unique constraints en DB.
 * Invocar cuando el pedido pasa a `paid` (smoke admin o MP post Gate 3G).
 */
export async function handleApprovedOrder(
  admin: SupabaseClient,
  orderId: string,
): Promise<HandleApprovedOrderResult> {
  const { data, error } = await admin.rpc("grant_digital_entitlements_for_paid_order", {
    p_order_id: orderId,
  });

  if (error) {
    return { ok: false, reason: "rpc_error" };
  }

  const payload = data as RpcPayload | null;
  if (!payload?.ok) {
    return { ok: false, reason: payload?.reason ?? "unknown" };
  }

  await syncSalesConversationPurchase(admin, orderId);

  return {
    ok: true,
    entitlementsCreated: payload.entitlementsCreated ?? 0,
    entitlementsActivated: payload.entitlementsActivated ?? 0,
  };
}
