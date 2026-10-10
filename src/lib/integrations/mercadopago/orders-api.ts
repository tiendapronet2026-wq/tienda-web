export const MERCADOPAGO_ORDERS_URL = "https://api.mercadopago.com/v1/orders";

export type MercadoPagoOrderItem = {
  title: string;
  unit_price: string;
  quantity: number;
  unit_measure: string;
  total_amount: string;
};

export type MercadoPagoCreateOrderInput = {
  accessToken: string;
  idempotencyKey: string;
  externalReference: string;
  totalAmount: string;
  currency: string;
  payerEmail: string;
  items: MercadoPagoOrderItem[];
  backUrls: {
    success: string;
    pending: string;
    failure: string;
  };
};

export type MercadoPagoCreateOrderResult = {
  id: string;
  checkoutUrl: string;
  status?: string;
  statusDetail?: string;
};

export type MercadoPagoOrderSnapshot = {
  id: string;
  externalReference: string | null;
  status: string;
  statusDetail: string | null;
  totalAmount: string | null;
  currency: string | null;
  userId: number | null;
};

function pickString(obj: Record<string, unknown>, key: string): string | null {
  const v = obj[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export function mapMercadoPagoOrderResponse(body: Record<string, unknown>): MercadoPagoOrderSnapshot {
  const totalRaw = body.total_amount ?? body.total;
  return {
    id: String(body.id ?? ""),
    externalReference: pickString(body, "external_reference"),
    status: String(body.status ?? ""),
    statusDetail: pickString(body, "status_detail"),
    totalAmount: totalRaw != null ? String(totalRaw) : null,
    currency: pickString(body, "currency") ?? pickString(body, "currency_id"),
    userId: typeof body.user_id === "number" ? body.user_id : null,
  };
}

export async function createMercadoPagoCheckoutOrder(
  input: MercadoPagoCreateOrderInput,
): Promise<MercadoPagoCreateOrderResult> {
  const payload = {
    type: "online",
    processing_mode: "manual",
    external_reference: input.externalReference,
    total_amount: input.totalAmount,
    currency: input.currency,
    payer: { email: input.payerEmail },
    items: input.items,
    config: {
      online: {
        success_url: input.backUrls.success,
        pending_url: input.backUrls.pending,
        failure_url: input.backUrls.failure,
        auto_return: "approved",
      },
    },
  };

  const res = await fetch(MERCADOPAGO_ORDERS_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      authorization: `Bearer ${input.accessToken}`,
      "x-idempotency-key": input.idempotencyKey,
    },
    body: JSON.stringify(payload),
  });

  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const message = pickString(body, "message") ?? pickString(body, "error") ?? "mp_order_create_failed";
    throw new Error(message);
  }

  const checkout = extractMercadoPagoCheckoutUrl(body);

  const id = pickString(body, "id");
  if (!id || !checkout) {
    throw new Error("Respuesta inválida al crear order Mercado Pago.");
  }

  return {
    id,
    checkoutUrl: checkout,
    status: pickString(body, "status") ?? undefined,
    statusDetail: pickString(body, "status_detail") ?? undefined,
  };
}

export function extractMercadoPagoCheckoutUrl(body: Record<string, unknown>): string | null {
  const direct = pickString(body, "checkout_url");
  if (direct) return direct;
  if (typeof body.config === "object" && body.config) {
    const fromConfig = pickString(body.config as Record<string, unknown>, "checkout_url");
    if (fromConfig) return fromConfig;
  }
  const online =
    typeof body.config === "object" && body.config
      ? (body.config as Record<string, unknown>).online
      : null;
  if (online && typeof online === "object") {
    return pickString(online as Record<string, unknown>, "checkout_url");
  }
  return null;
}

export async function fetchMercadoPagoOrder(
  accessToken: string,
  orderId: string,
): Promise<MercadoPagoOrderSnapshot> {
  const res = await fetch(`${MERCADOPAGO_ORDERS_URL}/${encodeURIComponent(orderId)}`, {
    headers: {
      accept: "application/json",
      authorization: `Bearer ${accessToken}`,
    },
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const message = pickString(body, "message") ?? "mp_order_fetch_failed";
    throw new Error(message);
  }
  return mapMercadoPagoOrderResponse(body);
}
