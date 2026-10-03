"use client";

import { useState, useTransition } from "react";
import { upsertDigitalDeliveryResource } from "@/app/admin/actions/digital-delivery";

export function DigitalDeliveryResourceForm({
  productId,
  defaultResourceId,
}: {
  productId: string;
  defaultResourceId?: string | null;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="mt-8 rounded-2xl border border-border bg-surface p-6"
      action={(formData) => {
        startTransition(async () => {
          const result = await upsertDigitalDeliveryResource(formData);
          setMessage(result.error ?? result.success ?? null);
        });
      }}
    >
      <h3 className="font-semibold">Entrega digital (Google Drive)</h3>
      <p className="mt-1 text-xs text-muted">
        Solo administración. El ID de carpeta no se muestra en la tienda pública; el comprador accede vía Mis compras.
      </p>
      <input type="hidden" name="product_id" value={productId} />
      <div className="mt-4">
        <label className="mb-1 block text-sm font-medium">ID de carpeta Drive</label>
        <input
          name="external_resource_id"
          defaultValue={defaultResourceId ?? ""}
          required
          className="w-full rounded-xl border border-border px-4 py-3 text-sm"
          placeholder="Ej. ID de carpeta (no la URL completa)"
        />
      </div>
      {message && <p className="mt-3 text-sm text-text-secondary">{message}</p>}
      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-xl bg-hero px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Guardando..." : "Guardar recurso"}
      </button>
    </form>
  );
}
