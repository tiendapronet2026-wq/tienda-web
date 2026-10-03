"use client";

import { useState, useTransition } from "react";
import { adminApproveDigitalTestOrder } from "@/app/admin/actions/digital-launch-smoke";

export function DigitalSmokeApproveButton({ orderId }: { orderId: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="mt-6 rounded-xl border border-dashed border-amber-500/50 bg-amber-500/5 p-4">
      <p className="text-sm font-semibold text-foreground">Smoke digital (solo prueba)</p>
      <p className="mt-1 text-xs text-muted">
        Marca el pedido como pagado y ejecuta entrega digital idempotente. Solo pedidos con marcador
        de prueba.
      </p>
      {message && <p className="mt-2 text-sm text-text-secondary">{message}</p>}
      <button
        type="button"
        disabled={pending}
        className="mt-3 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        onClick={() => {
          setMessage(null);
          startTransition(async () => {
            const result = await adminApproveDigitalTestOrder(orderId);
            if (result.error) {
              setMessage(result.error);
              return;
            }
            setMessage("Pedido aprobado y entrega digital ejecutada.");
          });
        }}
      >
        {pending ? "Procesando..." : "Simular pago aprobado (TEST)"}
      </button>
    </div>
  );
}
