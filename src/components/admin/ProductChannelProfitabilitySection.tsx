"use client";

import { useEffect, useState, useTransition } from "react";
import {
  simulateChannelProfitability,
  simulateChannelTargetPrice,
} from "@/app/admin/actions/channel-profiles";
import { formatCost } from "@/lib/utils";
import type { ChannelProfileRow } from "@/components/admin/ChannelProfileForm";

export type ChannelProfitabilityRpc = {
  product_id: string;
  profile_id: string;
  profile_name?: string;
  catalog_final_price: number;
  final_price: number;
  tax_rate: number;
  net_sales_revenue: number;
  production_cost: number;
  units_per_order: number;
  channel_fee: number;
  payment_fee: number;
  fixed_fee_unit: number;
  shipping_unit: number;
  other_cost_unit: number;
  channel_cost_per_unit: number;
  unit_contribution: number;
  channel_margin: number | null;
  return_on_production_cost: number | null;
  break_even_final_price: number | null;
  break_even_viable: boolean;
};

export type ChannelTargetPriceRpc = {
  feasible: boolean;
  infeasible_reason?: string | null;
  catalog_final_price: number;
  raw_required_final_price?: number | null;
  rounded_required_final_price?: number | null;
  resulting_contribution?: number | null;
  resulting_channel_margin?: number | null;
  current_price_gap?: number | null;
  current_price_gap_percent?: number | null;
  target_channel_margin_percent?: number;
};

const section =
  "mt-8 rounded-[var(--radius-xl)] border border-border bg-surface p-5 shadow-[var(--shadow-sm)] sm:p-6";

function pct(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(2)} %`;
}

export function ProductChannelProfitabilitySection({
  productId,
  catalogPrice,
  currency,
  profiles,
  initialProfileId,
}: {
  productId: string;
  catalogPrice: number;
  currency: string;
  profiles: ChannelProfileRow[];
  initialProfileId: string | null;
}) {
  const [profileId, setProfileId] = useState(initialProfileId ?? profiles[0]?.id ?? "");
  const [priceOverride, setPriceOverride] = useState("");
  const [unitsOverride, setUnitsOverride] = useState("");
  const [result, setResult] = useState<ChannelProfitabilityRpc | null>(null);
  const [targetResult, setTargetResult] = useState<ChannelTargetPriceRpc | null>(null);
  const [targetMargin, setTargetMargin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selectedProfile = profiles.find((p) => p.id === profileId);

  const runSimulation = () => {
    if (!profileId) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("product_id", productId);
      fd.set("profile_id", profileId);
      if (priceOverride.trim()) fd.set("final_price_override", priceOverride.trim());
      if (unitsOverride.trim()) fd.set("units_per_order", unitsOverride.trim());
      const r = await simulateChannelProfitability(fd);
      if (r.error) {
        setError(r.error);
        setResult(null);
        setTargetResult(null);
        return;
      }
      setError(null);
      setResult(r.data as ChannelProfitabilityRpc);

      const fdTarget = new FormData();
      fdTarget.set("product_id", productId);
      fdTarget.set("profile_id", profileId);
      if (targetMargin.trim()) fdTarget.set("target_channel_margin_percent", targetMargin.trim());
      if (unitsOverride.trim()) fdTarget.set("units_per_order", unitsOverride.trim());
      const t = await simulateChannelTargetPrice(fdTarget);
      if (t.error) {
        setTargetResult(null);
      } else {
        setTargetResult(t.data as ChannelTargetPriceRpc);
      }
    });
  };

  useEffect(() => {
    const def = selectedProfile?.target_channel_margin_percent;
    setTargetMargin(def != null ? String(def) : "40");
  }, [profileId, selectedProfile?.target_channel_margin_percent]);

  useEffect(() => {
    if (profileId) runSimulation();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recalc when profile changes
  }, [profileId]);

  if (profiles.length === 0) {
    return (
      <section className={section}>
        <h2 className="text-lg font-semibold">Rentabilidad por canal</h2>
        <p className="mt-2 text-sm text-muted">
          Creá al menos un perfil en{" "}
          <a href="/admin/perfiles-rentabilidad" className="text-brand hover:underline">
            Perfiles de rentabilidad
          </a>
          .
        </p>
      </section>
    );
  }

  const fixedUnitTotal =
    result != null ? result.fixed_fee_unit + result.shipping_unit + result.other_cost_unit : null;

  return (
    <section className={section}>
      <h2 className="text-lg font-semibold">Rentabilidad por canal</h2>
      <p className="mt-1 text-sm text-muted">
        Simulación en vivo. No modifica el precio de catálogo ni el historial de adopciones (Gate 3B).
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-sm font-medium">
          Perfil
          <select
            value={profileId}
            onChange={(e) => setProfileId(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Simular precio final (opcional)
          <input
            type="text"
            inputMode="decimal"
            placeholder={String(catalogPrice)}
            value={priceOverride}
            onChange={(e) => setPriceOverride(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
          />
          <span className="text-xs text-muted">Catálogo vigente: {formatCost(catalogPrice, currency)}</span>
        </label>
        <label className="text-sm font-medium">
          Unidades por pedido (opcional)
          <input
            type="text"
            inputMode="decimal"
            placeholder="Default del perfil"
            value={unitsOverride}
            onChange={(e) => setUnitsOverride(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={runSimulation}
        disabled={pending || !profileId}
        className="mt-4 rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted/30 disabled:opacity-50"
      >
        {pending ? "Calculando…" : "Recalcular"}
      </button>

      {error && <p className="mt-3 text-sm text-error">{error}</p>}

      {result && (
        <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Precio final (simulación)</dt>
            <dd className="font-medium">{formatCost(result.final_price, currency)}</dd>
          </div>
          <div>
            <dt className="text-muted">Venta neta (ref. fiscal)</dt>
            <dd>{formatCost(result.net_sales_revenue, currency)}</dd>
          </div>
          <div>
            <dt className="text-muted">Costo producción (Gate 2)</dt>
            <dd>{formatCost(result.production_cost, currency)}</dd>
          </div>
          <div>
            <dt className="text-muted">Comisión canal</dt>
            <dd>{formatCost(result.channel_fee, currency)}</dd>
          </div>
          <div>
            <dt className="text-muted">Comisión cobro</dt>
            <dd>{formatCost(result.payment_fee, currency)}</dd>
          </div>
          <div>
            <dt className="text-muted">Costos fijos por unidad</dt>
            <dd>{fixedUnitTotal != null ? formatCost(fixedUnitTotal, currency) : "—"}</dd>
          </div>
          <div>
            <dt className="text-muted">Envío absorbido / unidad</dt>
            <dd>{formatCost(result.shipping_unit, currency)}</dd>
          </div>
          <div className="sm:col-span-2 border-t border-border pt-4">
            <dt className="text-muted">Contribución unitaria</dt>
            <dd className="text-xl font-bold text-brand">
              {formatCost(result.unit_contribution, currency)}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Margen del canal</dt>
            <dd>{pct(result.channel_margin)}</dd>
          </div>
          <div>
            <dt className="text-muted">Retorno sobre costo productivo</dt>
            <dd>{pct(result.return_on_production_cost)}</dd>
          </div>
          <div>
            <dt className="text-muted">Precio de equilibrio (final)</dt>
            <dd>
              {result.break_even_viable && result.break_even_final_price != null
                ? formatCost(result.break_even_final_price, currency)
                : "Perfil inviable (fees ≥ venta neta)"}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Unidades por pedido</dt>
            <dd>{result.units_per_order}</dd>
          </div>
        </dl>
      )}

      <div className="mt-10 border-t border-border pt-6">
        <h3 className="text-base font-semibold">Precio objetivo del canal</h3>
        <p className="mt-1 text-xs text-muted">
          Simulación — no modifica el precio publicado ni llama a adopción (Gate 3B).
        </p>
        <label className="mt-4 block max-w-xs text-sm font-medium">
          Margen de contribución objetivo (%)
          <input
            type="text"
            inputMode="decimal"
            value={targetMargin}
            onChange={(e) => setTargetMargin(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
          />
        </label>

        {targetResult && !targetResult.feasible && (
          <p className="mt-4 rounded-lg bg-error/10 px-4 py-3 text-sm text-error">
            <strong>Objetivo no alcanzable con esta estructura.</strong>
            <br />
            {targetResult.infeasible_reason ??
              "Revisá comisiones, impuesto de referencia y margen deseado."}
          </p>
        )}

        {targetResult?.feasible && (
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted">Precio actual (catálogo)</dt>
              <dd>{formatCost(targetResult.catalog_final_price, currency)}</dd>
            </div>
            <div>
              <dt className="text-muted">Precio necesario (redondeado)</dt>
              <dd className="font-semibold text-brand">
                {targetResult.rounded_required_final_price != null
                  ? formatCost(targetResult.rounded_required_final_price, currency)
                  : "—"}
              </dd>
            </div>
            {targetResult.raw_required_final_price != null && (
              <div>
                <dt className="text-muted">Precio matemático (sin redondeo)</dt>
                <dd>{formatCost(targetResult.raw_required_final_price, currency)}</dd>
              </div>
            )}
            <div>
              <dt className="text-muted">Diferencia</dt>
              <dd>
                {targetResult.current_price_gap != null
                  ? `${targetResult.current_price_gap >= 0 ? "+" : ""}${formatCost(
                      targetResult.current_price_gap,
                      currency,
                    )}`
                  : "—"}
                {targetResult.current_price_gap_percent != null && (
                  <span className="text-muted">
                    {" "}
                    ({(targetResult.current_price_gap_percent * 100).toFixed(2)} %)
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Contribución resultante</dt>
              <dd>
                {targetResult.resulting_contribution != null
                  ? formatCost(Number(targetResult.resulting_contribution), currency)
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Margen de contribución resultante</dt>
              <dd>{pct(targetResult.resulting_channel_margin != null ? Number(targetResult.resulting_channel_margin) : null)}</dd>
            </div>
          </dl>
        )}
      </div>
    </section>
  );
}
