"use client";

import { useState, useTransition } from "react";
import { formatCost, formatPrice } from "@/lib/utils";
import {
  captureProductCostSnapshot,
  updateProductTargetMargin,
} from "@/app/admin/actions/pricing";

export type ProductPricingRpc = {
  production_cost: number;
  manual_cost_price: number | null;
  current_sale_price: number;
  target_margin_on_sale_percent: number;
  net_price: number;
  tax_rate_percent: number;
  tax_amount: number;
  rounding_rule: string;
  suggested_price: number;
  actual_margin_on_sale: number | null;
  actual_markup_on_cost: number | null;
  unit_result: number | null;
  below_cost: boolean;
};

const section =
  "mt-8 rounded-[var(--radius-xl)] border border-border bg-surface p-5 shadow-[var(--shadow-sm)] sm:p-6";

function pct(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(2)} %`;
}

function pctDirect(percent: number): string {
  return `${percent.toFixed(2)} %`;
}

export function ProductPricingSection({
  productId,
  pricing,
  currency,
}: {
  productId: string;
  pricing: ProductPricingRpc | null;
  currency: string;
}) {
  const [msg, setMsg] = useState<{ error?: string; success?: string } | null>(null);
  const [pending, startTransition] = useTransition();

  if (!pricing) {
    return (
      <section className={section}>
        <h2 className="text-lg font-semibold">Precio y rentabilidad</h2>
        <p className="mt-2 text-sm text-muted">
          No se pudo cargar el análisis (aplicá la migración Gate 3A en Supabase si aún no está).
        </p>
      </section>
    );
  }

  const fmtCost = (n: number) => formatCost(n, currency);
  const marginTarget = pricing.target_margin_on_sale_percent;

  return (
    <section className={section}>
      <h2 className="text-lg font-semibold">Precio y rentabilidad</h2>
      <p className="mt-1 text-sm text-text-secondary">
        Costo desde Gate 2 (`total_cost`). No se modifica el precio de venta ni `cost_price` automáticamente.
      </p>

      {pricing.below_cost && (
        <p className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
          Precio actual por debajo del costo calculado. Resultado unitario:{" "}
          <strong>{fmtCost(pricing.unit_result ?? 0)}</strong>
        </p>
      )}

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Costo calculado</dt>
          <dd className="font-medium">{fmtCost(pricing.production_cost)}</dd>
        </div>
        {pricing.manual_cost_price != null && (
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Costo manual (`cost_price`)</dt>
            <dd>{fmtCost(pricing.manual_cost_price)}</dd>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Precio actual</dt>
          <dd className="font-medium">{formatPrice(pricing.current_sale_price)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Margen sobre venta (actual)</dt>
          <dd>{pct(pricing.actual_margin_on_sale)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Recargo sobre costo (actual)</dt>
          <dd>{pct(pricing.actual_markup_on_cost)}</dd>
        </div>
      </dl>

      <form
        className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
        action={(fd) => {
          startTransition(async () => {
            const r = await updateProductTargetMargin(fd);
            setMsg(r.error ? { error: r.error } : { success: r.success });
          });
        }}
      >
        <input type="hidden" name="product_id" value={productId} />
        <label className="flex-1 text-sm">
          <span className="text-muted">Margen sobre venta (objetivo) %</span>
          <input
            type="number"
            name="target_sale_margin_percent"
            min={0}
            max={99.99}
            step={0.01}
            required
            defaultValue={marginTarget}
            className="mt-1 w-full rounded-[var(--radius-md)] border border-border px-3 py-2.5"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-[var(--radius-md)] bg-brand px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Guardando…" : "Guardar objetivo"}
        </button>
      </form>

      <div className="mt-6 border-t border-border pt-4">
        <p className="text-sm text-muted">Precio sugerido (objetivo + impuesto referencia + redondeo)</p>
        <p className="mt-1 text-xl font-semibold text-brand">{formatPrice(pricing.suggested_price)}</p>
        <dl className="mt-3 space-y-1 text-xs text-muted">
          <div className="flex justify-between gap-2">
            <dt>Precio neto objetivo</dt>
            <dd>{fmtCost(pricing.net_price)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>Impuesto ({pctDirect(pricing.tax_rate_percent)} sobre neto)</dt>
            <dd>{fmtCost(pricing.tax_amount)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>Redondeo</dt>
            <dd>{pricing.rounding_rule}</dd>
          </div>
        </dl>
        {pricing.actual_margin_on_sale != null && (
          <p className="mt-2 text-xs text-muted">
            Diferencia vs objetivo:{" "}
            {pctDirect(marginTarget - pricing.actual_margin_on_sale * 100)} (puntos de margen sobre
            venta)
          </p>
        )}
      </div>

      <form
        className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end"
        action={(fd) => {
          startTransition(async () => {
            const r = await captureProductCostSnapshot(fd);
            setMsg(r.error ? { error: r.error } : { success: r.success });
          });
        }}
      >
        <input type="hidden" name="product_id" value={productId} />
        <label className="flex-1 text-sm">
          <span className="text-muted">Motivo snapshot de costo</span>
          <input
            name="reason"
            placeholder="Ej. Revisión de precios marzo"
            className="mt-1 w-full rounded-[var(--radius-md)] border border-border px-3 py-2.5"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-[var(--radius-md)] border border-border px-4 py-2.5 text-sm font-medium"
        >
          Registrar snapshot de costo
        </button>
      </form>

      {msg?.error && (
        <p className="mt-3 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-700">{msg.error}</p>
      )}
      {msg?.success && (
        <p className="mt-3 rounded-md bg-brand-soft px-3 py-2 text-sm text-brand">{msg.success}</p>
      )}
    </section>
  );
}
