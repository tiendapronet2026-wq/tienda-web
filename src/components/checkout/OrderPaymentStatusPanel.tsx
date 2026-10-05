"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";

type PaymentStatus = {
  found: boolean;
  status?: string;
  mp_status?: string | null;
  mp_status_detail?: string | null;
  total?: number;
  currency?: string;
};

export function OrderPaymentStatusPanel({
  orderId,
  title,
  hint,
}: {
  orderId: string;
  title: string;
  hint: string;
}) {
  const [data, setData] = useState<PaymentStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}/payment-status`, { cache: "no-store" });
        const json = (await res.json()) as PaymentStatus;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setData({ found: false });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const paid = data?.status === "paid";
  const pending =
    data?.status === "awaiting_payment" ||
    data?.mp_status === "created" ||
    data?.mp_status === "pending" ||
    data?.mp_status_detail === "pending";

  return (
    <div className="tp-container py-10 sm:py-12">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
      <p className="mt-2 max-w-2xl text-text-secondary">{hint}</p>
      <p className="mt-2 text-sm text-muted">
        Pedido <span className="font-mono">{orderId.slice(0, 8)}</span>
      </p>

      {loading ? (
        <p className="mt-6 text-sm text-muted">Consultando estado en Tienda Pro…</p>
      ) : !data?.found ? (
        <p className="mt-6 text-sm text-error">No pudimos cargar el estado del pedido.</p>
      ) : (
        <div className="mt-6 rounded-xl border border-border bg-surface p-5 text-sm">
          <p>
            Estado interno: <strong>{data.status}</strong>
          </p>
          {data.mp_status && (
            <p className="mt-1">
              Mercado Pago: <strong>{data.mp_status}</strong>
              {data.mp_status_detail ? ` · ${data.mp_status_detail}` : null}
            </p>
          )}
          {data.total != null && data.currency && (
            <p className="mt-2 font-medium text-brand">
              Total: {formatPrice(Number(data.total))} {data.currency}
            </p>
          )}
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        {paid ? (
          <Link href="/mis-compras" className="text-sm font-medium text-brand hover:underline">
            Ir a Mis compras
          </Link>
        ) : pending ? (
          <Link href={`/checkout/pagar?pedido=${orderId}`} className="text-sm font-medium text-brand hover:underline">
            Reintentar pago
          </Link>
        ) : (
          <Link href="/productos" className="text-sm font-medium text-brand hover:underline">
            Volver al catálogo
          </Link>
        )}
      </div>
    </div>
  );
}
