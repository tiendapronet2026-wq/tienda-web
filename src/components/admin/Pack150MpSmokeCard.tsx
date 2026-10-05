"use client";

import { useState, useTransition } from "react";
import { adminStartPack150MercadoPagoSmokeCheckout } from "@/app/admin/actions/pack150-mp-smoke";

export function Pack150MpSmokeCard({ enabled }: { enabled: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!enabled) return null;

  return (
    <section className="mt-10 rounded-[var(--radius-xl)] border border-amber-500/40 bg-amber-500/5 p-5">
      <h2 className="text-lg font-semibold text-foreground">Smoke privado Pack 150 + Mercado Pago</h2>
      <p className="mt-2 text-sm text-muted">
        Solo admin. Requiere <code className="text-xs">TIENDAPRO_DIGITAL_SMOKE_ENABLED=1</code> y{" "}
        <code className="text-xs">TIENDAPRO_MP_ORDERS_CHECKOUT_ENABLED=1</code> en el entorno. No activa el
        producto en catálogo público. Precio releído en servidor. Cobro real en Mercado Pago.
      </p>
      {error && <p className="mt-3 text-sm text-error">{error}</p>}
      <button
        type="button"
        disabled={pending}
        className="mt-4 rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        onClick={() => {
          startTransition(async () => {
            setError(null);
            const result = await adminStartPack150MercadoPagoSmokeCheckout();
            if (result.error) {
              setError(result.error);
              return;
            }
            if (result.data?.checkoutUrl) {
              window.location.assign(result.data.checkoutUrl);
            }
          });
        }}
      >
        {pending ? "Preparando checkout…" : "Iniciar checkout MP (Pack 150 smoke)"}
      </button>
    </section>
  );
}
