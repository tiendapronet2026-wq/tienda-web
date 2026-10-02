"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  simulateChannelProfitability,
  simulateChannelTargetPrice,
} from "@/app/admin/actions/channel-profiles";
import {
  adoptProductChannelPrice,
  revertProductChannelPrice,
} from "@/app/admin/actions/channel-prices";
import { effectiveChannelFinalPrice } from "@/lib/channel-price-effective";
import { formatCost } from "@/lib/utils";
import type { ChannelProfileRow } from "@/components/admin/ChannelProfileForm";

export type ChannelPriceOverrideRow = {
  channel_cost_profile_id: string;
  final_price: number;
  is_active: boolean;
};

export type ChannelPriceHistoryRow = {
  id: string;
  channel_cost_profile_id: string;
  previous_price: number;
  adopted_price: number;
  suggested_required_price: number | null;
  resulting_channel_margin: number | null;
  reason: string | null;
  created_at: string;
  metadata?: { source?: string } | null;
};

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
  channelPrices,
  channelHistory,
}: {
  productId: string;
  catalogPrice: number;
  currency: string;
  profiles: ChannelProfileRow[];
  initialProfileId: string | null;
  channelPrices: ChannelPriceOverrideRow[];
  channelHistory: ChannelPriceHistoryRow[];
}) {
  const [profileId, setProfileId] = useState(initialProfileId ?? profiles[0]?.id ?? "");
  const [priceOverride, setPriceOverride] = useState("");
  const [unitsOverride, setUnitsOverride] = useState("");
  const [result, setResult] = useState<ChannelProfitabilityRpc | null>(null);
  const [targetResult, setTargetResult] = useState<ChannelTargetPriceRpc | null>(null);
  const [targetMargin, setTargetMargin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [adoptMsg, setAdoptMsg] = useState<{ error?: string; success?: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [adoptTargetKey, setAdoptTargetKey] = useState(() => crypto.randomUUID());
  const [adoptCustomKey, setAdoptCustomKey] = useState(() => crypto.randomUUID());
  const [revertKey, setRevertKey] = useState(() => crypto.randomUUID());
  const [confirmAdoptTarget, setConfirmAdoptTarget] = useState(false);
  const [confirmAdoptCustom, setConfirmAdoptCustom] = useState(false);
  const [confirmRevert, setConfirmRevert] = useState(false);
  const [customChannelPrice, setCustomChannelPrice] = useState("");

  const selectedProfile = profiles.find((p) => p.id === profileId);

  const channelOverride = useMemo(
    () => channelPrices.find((r) => r.channel_cost_profile_id === profileId) ?? null,
    [channelPrices, profileId],
  );

  const effective = useMemo(
    () => effectiveChannelFinalPrice(catalogPrice, channelOverride),
    [catalogPrice, channelOverride],
  );

  const historyForProfile = useMemo(
    () => channelHistory.filter((h) => h.channel_cost_profile_id === profileId).slice(0, 10),
    [channelHistory, profileId],
  );

  const runSimulation = () => {
    if (!profileId) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("product_id", productId);
      fd.set("profile_id", profileId);
      const simPrice = priceOverride.trim() ? priceOverride.trim() : String(effective.price);
      fd.set("final_price_override", simPrice);
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

  const onAdoptResult = (r: { error?: string; data?: unknown }) => {
    if (r.error) {
      setAdoptMsg({ error: r.error });
      return;
    }
    setAdoptMsg({ success: "Precio del canal guardado. El precio de catálogo no cambió." });
    setConfirmAdoptTarget(false);
    setConfirmAdoptCustom(false);
    setAdoptTargetKey(crypto.randomUUID());
    setAdoptCustomKey(crypto.randomUUID());
    router.refresh();
    runSimulation();
  };

  const onRevertResult = (r: { error?: string; data?: unknown }) => {
    if (r.error) {
      setAdoptMsg({ error: r.error });
      return;
    }
    setAdoptMsg({ success: "Este canal vuelve a usar el precio general." });
    setConfirmRevert(false);
    setRevertKey(crypto.randomUUID());
    router.refresh();
    runSimulation();
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
        Simulación (Gate 3C/3D) y adopción explícita por canal (Gate 3E). El checkout aún usa solo el
        precio general del catálogo.
      </p>

      <dl className="mt-4 grid gap-3 rounded-xl border border-border bg-background/50 p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted">Precio general (catálogo)</dt>
          <dd className="font-medium">{formatCost(catalogPrice, currency)}</dd>
        </div>
        <div>
          <dt className="text-muted">Precio del canal</dt>
          <dd className="font-medium">
            {effective.usesCatalog
              ? `Usa general (${formatCost(catalogPrice, currency)})`
              : formatCost(effective.price, currency)}
          </dd>
        </div>
        {targetResult?.feasible && targetResult.rounded_required_final_price != null && (
          <>
            <div>
              <dt className="text-muted">Precio objetivo calculado</dt>
              <dd>{formatCost(targetResult.rounded_required_final_price, currency)}</dd>
            </div>
            <div>
              <dt className="text-muted">Margen objetivo</dt>
              <dd>
                {targetResult.target_channel_margin_percent != null
                  ? `${targetResult.target_channel_margin_percent} %`
                  : pct(
                      targetMargin.trim()
                        ? Number(targetMargin.replace(",", ".")) / 100
                        : (selectedProfile?.target_channel_margin_percent ?? 40) / 100,
                    )}
              </dd>
            </div>
          </>
        )}
        {result && (
          <div className="sm:col-span-2">
            <dt className="text-muted">Margen real del precio del canal (simulación actual)</dt>
            <dd className="font-semibold">{pct(result.channel_margin)}</dd>
          </div>
        )}
      </dl>

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
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2" data-testid="channel-target-sim">
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

      <div className="mt-10 border-t border-border pt-6">
        <h3 className="text-base font-semibold">Adopción de precio por canal</h3>
        <p className="mt-1 text-xs text-muted">
          Persiste un precio para este perfil sin modificar <code className="text-xs">products.price</code>.
        </p>

        {adoptMsg?.error && <p className="mt-3 text-sm text-error">{adoptMsg.error}</p>}
        {adoptMsg?.success && (
          <p className="mt-3 rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand">{adoptMsg.success}</p>
        )}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {!confirmAdoptTarget ? (
            <button
              type="button"
              disabled={
                pending ||
                !targetResult?.feasible ||
                targetResult.rounded_required_final_price == null
              }
              className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              onClick={() => setConfirmAdoptTarget(true)}
            >
              Adoptar objetivo
              {targetResult?.rounded_required_final_price != null
                ? ` (${formatCost(targetResult.rounded_required_final_price, currency)})`
                : ""}
            </button>
          ) : (
            <form
              className="w-full max-w-md rounded-xl border border-border p-4 text-sm"
              action={(fd) => {
                startTransition(async () => onAdoptResult(await adoptProductChannelPrice(fd)));
              }}
            >
              <p className="font-medium">Confirmar precio objetivo del canal</p>
              <input type="hidden" name="product_id" value={productId} />
              <input type="hidden" name="profile_id" value={profileId} />
              <input type="hidden" name="idempotency_key" value={adoptTargetKey} />
              {unitsOverride.trim() && (
                <input type="hidden" name="units_per_order" value={unitsOverride.trim()} />
              )}
              <input
                name="reason"
                placeholder="Motivo (opcional)"
                className="mt-2 w-full rounded-xl border border-border px-3 py-2"
              />
              <div className="mt-3 flex gap-2">
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white"
                >
                  Confirmar
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-border px-4 py-2 text-sm"
                  onClick={() => setConfirmAdoptTarget(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {!confirmAdoptCustom ? (
            <button
              type="button"
              className="text-sm text-brand underline"
              onClick={() => setConfirmAdoptCustom(true)}
            >
              Definir otro precio
            </button>
          ) : (
            <form
              className="w-full max-w-md rounded-xl border border-border p-4 text-sm"
              action={(fd) => {
                startTransition(async () => onAdoptResult(await adoptProductChannelPrice(fd)));
              }}
            >
              <p className="font-medium">Adoptar precio manual del canal</p>
              <input type="hidden" name="product_id" value={productId} />
              <input type="hidden" name="profile_id" value={profileId} />
              <input type="hidden" name="idempotency_key" value={adoptCustomKey} />
              {unitsOverride.trim() && (
                <input type="hidden" name="units_per_order" value={unitsOverride.trim()} />
              )}
              <label className="mt-2 block">
                Precio final
                <input
                  name="adopted_price"
                  required
                  value={customChannelPrice}
                  onChange={(e) => setCustomChannelPrice(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border px-3 py-2"
                  inputMode="decimal"
                />
              </label>
              <input
                name="reason"
                placeholder="Motivo (opcional)"
                className="mt-2 w-full rounded-xl border border-border px-3 py-2"
              />
              <div className="mt-3 flex gap-2">
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-border px-4 py-2 text-sm"
                  onClick={() => setConfirmAdoptCustom(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {!effective.usesCatalog &&
            (!confirmRevert ? (
              <button
                type="button"
                className="text-sm text-muted underline"
                onClick={() => setConfirmRevert(true)}
              >
                Volver a precio general
              </button>
            ) : (
              <form
                className="w-full max-w-md rounded-xl border border-dashed border-border p-4 text-sm"
                action={(fd) => {
                  startTransition(async () => onRevertResult(await revertProductChannelPrice(fd)));
                }}
              >
                <p>¿Desactivar el override y usar el catálogo ({formatCost(catalogPrice, currency)})?</p>
                <input type="hidden" name="product_id" value={productId} />
                <input type="hidden" name="profile_id" value={profileId} />
                <input type="hidden" name="idempotency_key" value={revertKey} />
                <div className="mt-3 flex gap-2">
                  <button
                    type="submit"
                    disabled={pending}
                    className="rounded-xl border border-border px-4 py-2 text-sm font-medium"
                  >
                    Confirmar
                  </button>
                  <button
                    type="button"
                    className="rounded-xl px-4 py-2 text-sm"
                    onClick={() => setConfirmRevert(false)}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ))}
        </div>

        {historyForProfile.length > 0 && (
          <div className="mt-6 overflow-x-auto">
            <h4 className="text-sm font-semibold">Historial de adopciones (canal)</h4>
            <table className="mt-2 w-full min-w-[32rem] text-left text-xs">
              <thead>
                <tr className="text-muted">
                  <th className="py-1 pr-2">Fecha</th>
                  <th className="py-1 pr-2">Anterior</th>
                  <th className="py-1 pr-2">Adoptado</th>
                  <th className="py-1 pr-2">Objetivo</th>
                  <th className="py-1 pr-2">Margen</th>
                </tr>
              </thead>
              <tbody>
                {historyForProfile.map((row) => (
                  <tr key={row.id} className="border-t border-border/60">
                    <td className="py-1 pr-2">{new Date(row.created_at).toLocaleString("es-AR")}</td>
                    <td className="py-1 pr-2">{formatCost(row.previous_price, currency)}</td>
                    <td className="py-1 pr-2">{formatCost(row.adopted_price, currency)}</td>
                    <td className="py-1 pr-2">
                      {row.suggested_required_price != null
                        ? formatCost(row.suggested_required_price, currency)
                        : "—"}
                    </td>
                    <td className="py-1 pr-2">{pct(row.resulting_channel_margin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
