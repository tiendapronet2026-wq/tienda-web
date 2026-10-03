"use client";

import { useState, useTransition } from "react";
import { openDigitalEntitlementAccess } from "@/app/actions/digital-access";

export function DigitalEntitlementAccessButton({
  entitlementId,
  productName,
}: {
  entitlementId: string;
  productName: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h3 className="font-semibold">{productName}</h3>
      <p className="mt-1 text-sm text-muted">Estado: Disponible</p>
      {error && <p className="mt-2 text-sm text-error">{error}</p>}
      <button
        type="button"
        disabled={pending}
        className="mt-4 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await openDigitalEntitlementAccess(entitlementId);
            if (result.error) {
              setError(result.error);
              return;
            }
            if (result.accessUrl) {
              window.open(result.accessUrl, "_blank", "noopener,noreferrer");
            }
          });
        }}
      >
        {pending ? "Abriendo..." : "Acceder al contenido"}
      </button>
    </div>
  );
}
