"use client";

import { useState, useTransition } from "react";

export function ConnectConfirmForm({
  token,
  providerLabel,
  requesterLabel,
  expiresAt,
}: {
  token: string;
  providerLabel: string;
  requesterLabel: string;
  expiresAt: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const onConfirm = () => {
    startTransition(async () => {
      setError(null);
      const res = await fetch("/api/integrations/connect/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "No se pudo completar la vinculación.");
        return;
      }
      setDone(true);
    });
  };

  if (done) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-brand">¡Listo!</h1>
        <p className="mt-2 text-sm text-muted">La cuenta quedó vinculada. Podés volver a la PC.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <h1 className="text-xl font-semibold">Vincular a Tienda Pro</h1>
      <dl className="mt-4 space-y-2 text-sm">
        <div>
          <dt className="text-muted">Proveedor</dt>
          <dd className="font-medium">{providerLabel}</dd>
        </div>
        <div>
          <dt className="text-muted">Solicitado por</dt>
          <dd>{requesterLabel}</dd>
        </div>
        <div>
          <dt className="text-muted">Válido hasta</dt>
          <dd>{new Date(expiresAt).toLocaleString("es-AR")}</dd>
        </div>
      </dl>
      {error && <p className="mt-4 text-sm text-error">{error}</p>}
      <button
        type="button"
        disabled={pending}
        onClick={onConfirm}
        className="mt-6 w-full rounded-xl bg-brand py-3 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Vinculando…" : "Confirmar vinculación"}
      </button>
    </div>
  );
}
