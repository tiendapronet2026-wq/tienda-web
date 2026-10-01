"use client";

import { useEffect, useState, useTransition } from "react";
import { simulateChannelProfitability } from "@/app/admin/actions/channel-profiles";
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
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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
        return;
      }
      setError(null);
      setResult(r.data as ChannelProfitabilityRpc);
    });
  };

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
    </section>
  );
}
