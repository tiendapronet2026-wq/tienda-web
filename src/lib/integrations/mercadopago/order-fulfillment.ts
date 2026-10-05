import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleApprovedOrder } from "@/lib/digital/handle-approved-order";
import {
  fetchMercadoPagoOrder,
  type MercadoPagoOrderSnapshot,
} from "@/lib/integrations/mercadopago/orders-api";
import {
  getActiveMercadoPagoConnectionId,
  getMercadoPagoOAuthAccessToken,
} from "@/lib/integrations/mercadopago/access-token";

export type OrderRow = {
  id: string;
  user_id: string;
  status: string;
  total: number;
  currency: string;
  external_account_id?: string | null;
};

export function isMercadoPagoOrderAccredited(order: MercadoPagoOrderSnapshot): boolean {
  return order.status === "processed" && order.statusDetail === "accredited";
}

export function validateMercadoPagoOrderAgainstInternal(params: {
  mpOrder: MercadoPagoOrderSnapshot;
  internalOrderId: string;
  expectedTotal: number;
  expectedCurrency: string;
  expectedMpUserId: string | null;
}): { ok: true } | { ok: false; reason: string } {
  if (params.mpOrder.externalReference !== params.internalOrderId) {
    return { ok: false, reason: "external_reference_mismatch" };
  }
  if (
    params.expectedMpUserId &&
    params.mpOrder.userId != null &&
    String(params.mpOrder.userId) !== params.expectedMpUserId
  ) {
    return { ok: false, reason: "seller_mismatch" };
  }
  const mpAmount = params.mpOrder.totalAmount != null ? Number(params.mpOrder.totalAmount) : NaN;
  if (!Number.isFinite(mpAmount) || Math.round(mpAmount * 100) !== Math.round(params.expectedTotal * 100)) {
    return { ok: false, reason: "amount_mismatch" };
  }
  const mpCurrency = (params.mpOrder.currency ?? "ARS").toUpperCase();
  if (mpCurrency !== params.expectedCurrency.toUpperCase()) {
    return { ok: false, reason: "currency_mismatch" };
  }
  return { ok: true };
}

export async function syncMercadoPagoOrderAndFulfill(
  mpOrderId: string,
  admin: SupabaseClient = createAdminClient(),
): Promise<{ ok: boolean; reason: string; fulfillment?: { entitlementsCreated: number } }> {
  const connectionId = await getActiveMercadoPagoConnectionId(admin);
  if (!connectionId) return { ok: false, reason: "no_mp_connection" };

  const { data: conn } = await admin
    .from("integration_connections")
    .select("external_account_id")
    .eq("id", connectionId)
    .maybeSingle<{ external_account_id: string | null }>();

  const accessToken = await getMercadoPagoOAuthAccessToken(connectionId);
  const mpOrder = await fetchMercadoPagoOrder(accessToken, mpOrderId);

  if (!mpOrder.externalReference) {
    return { ok: false, reason: "missing_external_reference" };
  }

  const { data: order } = await admin
    .from("orders")
    .select("id, user_id, status, total, currency")
    .eq("id", mpOrder.externalReference)
    .maybeSingle<OrderRow>();

  if (!order) return { ok: false, reason: "internal_order_not_found" };

  const validation = validateMercadoPagoOrderAgainstInternal({
    mpOrder,
    internalOrderId: order.id,
    expectedTotal: Number(order.total),
    expectedCurrency: order.currency,
    expectedMpUserId: conn?.external_account_id ?? null,
  });
  if (!validation.ok) return { ok: false, reason: validation.reason };

  const amount = mpOrder.totalAmount != null ? Number(mpOrder.totalAmount) : Number(order.total);
  const { data: payResult, error: payErr } = await admin.rpc("apply_mercadopago_order_payment", {
    p_order_id: order.id,
    p_mp_order_id: mpOrder.id,
    p_mp_status: mpOrder.status,
    p_mp_status_detail: mpOrder.statusDetail ?? "",
    p_amount: amount,
    p_currency: order.currency,
  });

  if (payErr) return { ok: false, reason: "rpc_error" };

  const payload = payResult as { ok?: boolean; reason?: string };
  if (!isMercadoPagoOrderAccredited(mpOrder)) {
    return { ok: true, reason: payload.reason ?? "not_accredited" };
  }

  if (!payload.ok) {
    return { ok: false, reason: payload.reason ?? "payment_not_applied" };
  }

  const delivery = await handleApprovedOrder(admin, order.id);
  if (!delivery.ok) {
    return { ok: false, reason: delivery.reason };
  }

  return {
    ok: true,
    reason: payload.reason ?? "fulfilled",
    fulfillment: { entitlementsCreated: delivery.entitlementsCreated },
  };
}
