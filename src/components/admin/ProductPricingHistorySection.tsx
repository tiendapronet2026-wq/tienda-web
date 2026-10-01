"use client";

import { useState } from "react";
import { formatCost, formatDate, formatPrice } from "@/lib/utils";

export type PricingHistoryRow = {
  id: string;
  previous_price: number;
  adopted_price: number;
  production_cost: number;
  suggested_price: number;
  actual_margin_after_adoption: number | null;
  reason: string | null;
  created_at: string;
  created_by: string | null;
};

const section =
  "mt-6 rounded-[var(--radius-xl)] border border-border bg-surface p-5 shadow-[var(--shadow-sm)] sm:p-6";

function pct(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(2)} %`;
}

export function ProductPricingHistorySection({
  rows,
  currency,
}: {
  rows: PricingHistoryRow[];
  currency: string;
}) {
  const [open, setOpen] = useState(rows.length > 0);

  return (
    <section className={section}>
      <button
        type="button"
        className="flex w-full items-center justify-between text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <h2 className="text-lg font-semibold">Historial de precios</h2>
        <span className="text-sm text-muted">{open ? "Ocultar" : "Mostrar"} ({rows.length})</span>
      </button>
      {open && (
        <div className="mt-4 overflow-x-auto">
          {rows.length === 0 ? (
            <p className="text-sm text-muted">Sin adopciones registradas.</p>
          ) : (
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className="py-2 pr-3 font-medium">Fecha</th>
                  <th className="py-2 pr-3 font-medium">Anterior</th>
                  <th className="py-2 pr-3 font-medium">Adoptado</th>
                  <th className="py-2 pr-3 font-medium">Costo usado</th>
                  <th className="py-2 pr-3 font-medium">Margen</th>
                  <th className="py-2 pr-3 font-medium">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-border/60">
                    <td className="py-2 pr-3 whitespace-nowrap">{formatDate(row.created_at)}</td>
                    <td className="py-2 pr-3">{formatPrice(row.previous_price)}</td>
                    <td className="py-2 pr-3 font-medium">{formatPrice(row.adopted_price)}</td>
                    <td className="py-2 pr-3">{formatCost(row.production_cost, currency)}</td>
                    <td className="py-2 pr-3">{pct(row.actual_margin_after_adoption)}</td>
                    <td className="py-2 pr-3 text-muted">{row.reason || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </section>
  );
}
