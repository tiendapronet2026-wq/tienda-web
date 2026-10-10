import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicSiteUrl } from "@/lib/integrations/integration-service";
import { cartFulfillmentMode } from "@/lib/checkout/place-order";
import { isMercadoPagoOrdersCheckoutEnabled } from "@/lib/integrations/mercadopago/flags";
import {
  createMercadoPagoCheckoutOrder,
  extractMercadoPagoCheckoutUrl,
} from "@/lib/integrations/mercadopago/orders-api";
import {
  getActiveMercadoPagoConnectionId,
  getMercadoPagoOAuthAccessToken,
} from "@/lib/integrations/mercadopago/access-token";

function formatAmountArs(value: number): string {
  return (Math.round(value * 100) / 100).toFixed(2);
}

export function shouldUseMercadoPagoOrdersCheckout(lines: Parameters<typeof cartFulfillmentMode>[0]): boolean {
  if (!isMercadoPagoOrdersCheckoutEnabled()) return false;
  return cartFulfillmentMode(lines) === "digital";
}

export async function ensureMercadoPagoCheckoutForOrder(params: {
  orderId: string;
  userEmail: string;
}): Promise<{ checkoutUrl: string; mpOrderId: string }> {
  const admin = createAdminClient();
  const { data: order, error } = await admin
    .from("orders")
    .select("id, user_id, status, total, currency, mp_order_id, mp_idempotency_key")
    .eq("id", params.orderId)
    .maybeSingle<{
      id: string;
      user_id: string;
      status: string;
      total: number;
      currency: string;
      mp_order_id: string | null;
      mp_idempotency_key: string | null;
    }>();

  if (error || !order) throw new Error("Pedido no encontrado.");
  if (order.status === "paid") throw new Error("Este pedido ya está pagado.");

  const { data: items, error: itemsErr } = await admin
    .from("order_items")
    .select("product_name, unit_price, quantity, line_total")
    .eq("order_id", order.id);

  if (itemsErr || !items?.length) throw new Error("Pedido sin ítems.");

  const connectionId = await getActiveMercadoPagoConnectionId(admin);
  if (!connectionId) throw new Error("Mercado Pago no está conectado.");

  const idempotencyKey = order.mp_idempotency_key ?? `tp-order-${order.id}`;
  const accessToken = await getMercadoPagoOAuthAccessToken(connectionId);

  if (order.mp_order_id) {
    const res = await fetch(
      `https://api.mercadopago.com/v1/orders/${encodeURIComponent(order.mp_order_id)}`,
      {
        headers: {
          accept: "application/json",
          authorization: `Bearer ${accessToken}`,
        },
      },
    );
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const checkoutUrl = res.ok ? extractMercadoPagoCheckoutUrl(body) : null;
    if (checkoutUrl) {
      return { checkoutUrl, mpOrderId: order.mp_order_id };
    }
  }

  const created = await createMercadoPagoCheckoutOrder({
    accessToken,
    idempotencyKey,
    externalReference: order.id,
    totalAmount: formatAmountArs(Number(order.total)),
    currency: order.currency,
    payerEmail: params.userEmail,
    items: items.map((it) => ({
      title: it.product_name,
      unit_price: formatAmountArs(Number(it.unit_price)),
      quantity: it.quantity,
      unit_measure: "unit",
      total_amount: formatAmountArs(Number(it.line_total)),
    })),
    backUrls: buildBackUrls(order.id),
  });

  await admin
    .from("orders")
    .update({
      status: "awaiting_payment",
      payment_provider: "mercadopago",
      mp_order_id: created.id,
      mp_idempotency_key: idempotencyKey,
      mp_status: created.status ?? null,
      mp_status_detail: created.statusDetail ?? null,
    })
    .eq("id", order.id);

  return { checkoutUrl: created.checkoutUrl, mpOrderId: created.id };
}

function buildBackUrls(orderId: string) {
  const site = getPublicSiteUrl();
  const q = `pedido=${encodeURIComponent(orderId)}`;
  return {
    success: `${site}/checkout/pago/exito?${q}`,
    pending: `${site}/checkout/pago/pendiente?${q}`,
    failure: `${site}/checkout/pago/error?${q}`,
  };
}
