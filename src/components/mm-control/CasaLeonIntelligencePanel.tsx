"use client";

import { useMemo, useState } from "react";

function defaultRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getTime() - 6 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(from), to: fmt(to) };
}

type Snapshot = {
  ok?: boolean;
  period?: { from: string; to: string };
  results?: Record<
    string,
    { ok?: boolean; structured_data?: Record<string, unknown> }
  >;
  duration_ms?: number;
};

export function CasaLeonIntelligencePanel() {
  const initial = useMemo(() => defaultRange(), []);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/control/mm/intelligence-snapshot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ from, to, limit: 10 }),
      });
      const data = (await res.json()) as Snapshot & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Error al cargar");
        setSnapshot(null);
        return;
      }
      setSnapshot(data);
    } catch {
      setError("Error de red");
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  }

  const sales = snapshot?.results?.["casa_leon.sales.summary"]?.structured_data as
    | { sales?: { gross?: number; average_ticket?: number; transactions?: number }; empty?: boolean }
    | undefined;
  const channels = snapshot?.results?.["casa_leon.sales.by_channel"]?.structured_data as
    | { channels?: { channel: string; share_pct: number }[] }
    | undefined;
  const top = snapshot?.results?.["casa_leon.sales.top_products"]?.structured_data as
    | { products?: { product_name: string; units: number }[] }
    | undefined;
  const hours = snapshot?.results?.["casa_leon.sales.by_hour"]?.structured_data as
    | { peak?: { hour: number } | null }
    | undefined;
  const anomalies = snapshot?.results?.["casa_leon.operations.anomalies"]?.structured_data as
    | { anomalies?: { id: string; severity: string; description: string }[]; empty?: boolean }
    | undefined;

  const mainChannel = channels?.channels?.slice().sort((a, b) => b.share_pct - a.share_pct)[0];

  return (
    <div className="space-y-4 text-sm">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-[#a8b0bc]">Desde</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded border border-[#2a2f36] bg-[#0f1216] px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-[#a8b0bc]">Hasta</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded border border-[#2a2f36] bg-[#0f1216] px-2 py-1"
          />
        </label>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded bg-amber-500/90 px-4 py-2 font-medium text-black disabled:opacity-50"
        >
          {loading ? "Cargando…" : "Ver snapshot"}
        </button>
      </div>

      {error ? <p className="text-red-400">{error}</p> : null}

      {snapshot && sales?.empty ? (
        <p className="text-[#a8b0bc]">No hubo operaciones registradas en el período.</p>
      ) : null}

      {snapshot && !sales?.empty && sales?.sales ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-[#2a2f36] p-4">
            <p className="text-xs text-[#a8b0bc]">Ventas brutas</p>
            <p className="text-lg font-semibold text-[#f3f0e8]">
              {Number(sales.sales.gross ?? 0).toLocaleString("es-AR")}
            </p>
          </div>
          <div className="rounded-lg border border-[#2a2f36] p-4">
            <p className="text-xs text-[#a8b0bc]">Ticket promedio</p>
            <p className="text-lg font-semibold text-[#f3f0e8]">
              {Number(sales.sales.average_ticket ?? 0).toLocaleString("es-AR")}
            </p>
          </div>
          <div className="rounded-lg border border-[#2a2f36] p-4">
            <p className="text-xs text-[#a8b0bc]">Operaciones</p>
            <p className="text-lg font-semibold text-[#f3f0e8]">{sales.sales.transactions ?? 0}</p>
          </div>
          <div className="rounded-lg border border-[#2a2f36] p-4">
            <p className="text-xs text-[#a8b0bc]">Canal principal</p>
            <p className="text-lg font-semibold capitalize text-[#f3f0e8]">
              {mainChannel ? `${mainChannel.channel} (${mainChannel.share_pct.toFixed(0)}%)` : "—"}
            </p>
          </div>
        </div>
      ) : null}

      {top?.products?.length ? (
        <section className="rounded-lg border border-[#2a2f36] p-4">
          <h4 className="font-medium text-[#f3f0e8]">Top productos</h4>
          <ol className="mt-2 list-decimal pl-5 text-[#a8b0bc]">
            {top.products.slice(0, 5).map((p) => (
              <li key={p.product_name}>{p.product_name} — {p.units} u.</li>
            ))}
          </ol>
        </section>
      ) : null}

      {hours?.peak ? (
        <p className="text-[#a8b0bc]">Hora pico (mayor volumen): {hours.peak.hour}:00</p>
      ) : null}

      {anomalies && !anomalies.empty && anomalies.anomalies?.length ? (
        <section className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <h4 className="font-medium text-amber-200">Anomalías detectadas</h4>
          <ul className="mt-2 space-y-1 text-[#a8b0bc]">
            {anomalies.anomalies.map((a) => (
              <li key={a.id}>
                <span className="uppercase text-xs text-amber-400">{a.severity}</span> — {a.description} ({a.id})
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {snapshot?.duration_ms ? (
        <p className="text-xs text-[#6b7280]">Duración agregada: {snapshot.duration_ms} ms · sin LLM</p>
      ) : null}
    </div>
  );
}
