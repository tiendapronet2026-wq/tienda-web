"use client";

import { useMemo, useState, useTransition } from "react";
import { formatCost, formatPrice } from "@/lib/utils";
import { metricsFromAdoptedFinalPrice } from "@/lib/pricing-engine";
import {
  adoptProductPricing,
  captureProductCostSnapshot,
  updateProductTargetMargin,
} from "@/app/admin/actions/pricing";
import {
  ProductPricingHistorySection,
  type PricingHistoryRow,
} from "@/components/admin/ProductPricingHistorySection";

export type ProductPricingRpc = {
  production_cost: number;
  manual_cost_price: number | null;
  current_sale_price: number;
  current_net_sale_price: number | null;
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
  history,
}: {
  productId: string;
  pricing: ProductPricingRpc | null;
  currency: string;
  history: PricingHistoryRow[];
}) {
  const [msg, setMsg] = useState<{ error?: string; success?: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [suggestedKey, setSuggestedKey] = useState(() => crypto.randomUUID());
  const [customKey, setCustomKey] = useState(() => crypto.randomUUID());
  const [customPrice, setCustomPrice] = useState("");
  const [confirmSuggested, setConfirmSuggested] = useState(false);
  const [confirmCustom, setConfirmCustom] = useState(false);

  const taxFrac = pricing ? pricing.tax_rate_percent / 100 : 0;
  const customPreview = useMemo(() => {
    if (!pricing) return null;
    const p = Number(customPrice.replace(",", "."));
    if (!Number.isFinite(p) || p < 0) return null;
    return metricsFromAdoptedFinalPrice(pricing.production_cost, p, taxFrac);
  }, [customPrice, pricing, taxFrac]);
  const suggestedAfter = useMemo(() => {
    if (!pricing) return null;
    return metricsFromAdoptedFinalPrice(pricing.production_cost, pricing.suggested_price, taxFrac);
  }, [pricing, taxFrac]);

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

  const onAdoptResult = (r: { error?: string; success?: string }) => {
    setMsg(r.error ? { error: r.error } : { success: r.success });
    if (!r.error) {
      setSuggestedKey(crypto.randomUUID());
      setCustomKey(crypto.randomUUID());
      setConfirmSuggested(false);
      setConfirmCustom(false);
    }
  };

  return (
    <section className={section}>
      <h2 className="text-lg font-semibold">Precio y rentabilidad</h2>
      <p className="mt-1 text-sm text-text-secondary">
        Costo Gate 2 (neto operativo). Precio de catálogo = <strong>final</strong> con impuesto de referencia
        incluido (checkout no desglosa IVA). Margen y recargo actuales se calculan sobre el{" "}
        <strong>precio neto derivado</strong>.
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
          <dt className="text-muted">Precio actual (final catálogo)</dt>
          <dd className="font-medium">{formatPrice(pricing.current_sale_price)}</dd>
        </div>
        {pricing.tax_rate_percent > 0 && (
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Precio neto derivado (actual)</dt>
            <dd>{fmtCost(pricing.current_net_sale_price ?? 0)}</dd>
          </div>
        )}
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

      <div className="mt-6 space-y-4 border-t border-border pt-4">
        <h3 className="text-base font-semibold">Adoptar precio</h3>
        {!confirmSuggested ? (
          <button
            type="button"
            disabled={pending}
            className="w-full rounded-[var(--radius-md)] bg-brand px-4 py-3 text-sm font-medium text-white sm:w-auto"
            onClick={() => setConfirmSuggested(true)}
          >
            Adoptar precio sugerido ({formatPrice(pricing.suggested_price)})
          </button>
        ) : (
          <div className="rounded-md border border-border bg-background p-4 text-sm">
            <p className="font-medium">Confirmar adopción del precio sugerido</p>
            <ul className="mt-2 list-inside list-disc text-muted">
              <li>Costo calculado: {fmtCost(pricing.production_cost)}</li>
              <li>Precio actual: {formatPrice(pricing.current_sale_price)}</li>
              <li>Precio sugerido: {formatPrice(pricing.suggested_price)}</li>
              <li>
                Margen estimado tras adoptar: {pct(suggestedAfter?.actual_margin_on_sale ?? null)}
              </li>
            </ul>
            <form
              className="mt-3 flex flex-col gap-2"
              action={(fd) => {
                startTransition(async () => onAdoptResult(await adoptProductPricing(fd)));
              }}
            >
              <input type="hidden" name="product_id" value={productId} />
              <input type="hidden" name="adopt_mode" value="suggested" />
              <input type="hidden" name="idempotency_key" value={suggestedKey} />
              <input
                name="reason"
                placeholder="Motivo (opcional)"
                className="rounded-[var(--radius-md)] border border-border px-3 py-2"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-[var(--radius-md)] bg-brand px-4 py-2 text-sm font-medium text-white"
                >
                  Confirmar adopción
                </button>
                <button
                  type="button"
                  className="rounded-[var(--radius-md)] border border-border px-4 py-2 text-sm"
                  onClick={() => setConfirmSuggested(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {!confirmCustom ? (
          <button
            type="button"
            className="text-sm text-brand underline"
            onClick={() => setConfirmCustom(true)}
          >
            Adoptar otro precio
          </button>
        ) : (
          <div className="rounded-md border border-border bg-background p-4 text-sm">
            <p className="font-medium">Adoptar precio manual</p>
            <form
              className="mt-2 flex flex-col gap-2"
              action={(fd) => {
                startTransition(async () => onAdoptResult(await adoptProductPricing(fd)));
              }}
            >
              <input type="hidden" name="product_id" value={productId} />
              <input type="hidden" name="adopt_mode" value="custom" />
              <input type="hidden" name="idempotency_key" value={customKey} />
              <label className="text-sm">
                Precio final a adoptar
                <input
                  name="custom_adopted_price"
                  type="number"
                  min={0}
                  step={0.01}
                  required
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  className="mt-1 w-full rounded-[var(--radius-md)] border border-border px-3 py-2"
                />
              </label>
              {customPreview && (
                <p className="text-xs text-muted">
                  Sugerido {formatPrice(pricing.suggested_price)} → margen sobre venta (neto):{" "}
                  {pct(customPreview.actual_margin_on_sale)}
                </p>
              )}
              <input
                name="reason"
                placeholder="Motivo (opcional)"
                className="rounded-[var(--radius-md)] border border-border px-3 py-2"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-[var(--radius-md)] bg-brand px-4 py-2 text-sm font-medium text-white"
                >
                  Confirmar precio manual
                </button>
                <button
                  type="button"
                  className="rounded-[var(--radius-md)] border border-border px-4 py-2 text-sm"
                  onClick={() => setConfirmCustom(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
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

      <ProductPricingHistorySection rows={history} currency={currency} />
    </section>
  );
}
