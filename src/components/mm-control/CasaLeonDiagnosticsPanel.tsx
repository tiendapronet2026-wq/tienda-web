"use client";

import { useCallback, useState } from "react";
import { StatusPill } from "./StatusPill";

type CheckScope = "activation" | "platform" | "policy" | "meta";

type Check = { id: string; pass: boolean; label: string; last_at?: string | null; scope?: CheckScope };

type Diagnostics = {
  ok: boolean;
  project_status: string;
  connection_status: string;
  checklist: Check[];
  progress: { passed: number; total: number };
  diagnostic_progress?: { passed: number; total: number };
  activation_progress?: { met: boolean; passed: number; total: number };
};

const SCOPE_HEADINGS: Record<CheckScope, string> = {
  activation: "Requisitos de activación",
  platform: "Plataforma y evals",
  policy: "Políticas y capacidades opcionales",
  meta: "Resumen",
};

export function CasaLeonDiagnosticsPanel({ initial }: { initial: Diagnostics | null }) {
  const [data, setData] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [detail, setDetail] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/control/mm/diagnostics?project=casa_leon", { cache: "no-store" });
    if (res.ok) setData(await res.json());
  }, []);

  async function runTool(action: string) {
    setBusy(action);
    setError(null);
    setDetail(null);
    try {
      const res = await fetch("/api/control/mm/run-tool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      setDetail(json);
      if (!res.ok) setError(json.error ?? "run_failed");
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  async function runGeli() {
    setBusy("geli");
    setError(null);
    setDetail(null);
    try {
      const res = await fetch("/api/control/mm/geli-probe", { method: "POST", body: "{}" });
      const json = await res.json();
      setDetail(json);
      if (!res.ok) setError(json.error ?? "geli_failed");
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  async function promote() {
    setBusy("promote");
    setError(null);
    try {
      const res = await fetch("/api/control/mm/promote", { method: "POST" });
      const json = await res.json();
      setDetail(json);
      if (!res.ok) setError(json.error ?? "promote_failed");
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  if (!data) {
    return (
      <p className="text-sm text-[#a8b0bc]">
        Puente M&M no configurado o sin respuesta. Configurá{" "}
        <code className="text-xs">MM_TIENDAPRO_CONTROL_BRIDGE_SECRET</code> en servidor.
      </p>
    );
  }

  const ready = data.checklist.find((c) => c.id === "promotion_ready")?.pass;
  const isActive = data.project_status === "ACTIVE";
  const diagnostic = data.diagnostic_progress ?? data.progress;
  const scopes: CheckScope[] = ["activation", "platform", "policy", "meta"];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <StatusPill label={data.project_status} tone={isActive ? "ok" : "warn"} />
        <StatusPill label={data.connection_status} tone={data.connection_status === "ACTIVE" ? "ok" : "muted"} />
        <StatusPill label="READ ONLY" tone="read" />
        <span className="text-sm text-[#a8b0bc]">
          Diagnóstico: {diagnostic.passed}/{diagnostic.total} checks
        </span>
        {isActive && data.activation_progress?.met ? (
          <span className="text-sm text-emerald-300/90">Activación: completa</span>
        ) : null}
      </div>

      <div className="space-y-4">
        {scopes.map((scope) => {
          const rows = data.checklist.filter((c) => (c.scope ?? "activation") === scope);
          if (rows.length === 0) return null;
          return (
            <section key={scope}>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-[#8a919c]">
                {SCOPE_HEADINGS[scope]}
              </h3>
              <ul className="divide-y divide-[#2a2f36] rounded-lg border border-[#2a2f36]">
                {rows.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                    <span className="text-[#f3f0e8]">{c.label}</span>
                    <StatusPill label={c.pass ? "OK" : "PENDIENTE"} tone={c.pass ? "ok" : "warn"} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!!busy}
          onClick={() => runTool("system_health")}
          className="rounded-md bg-amber-500/20 px-3 py-2 text-sm text-amber-100 hover:bg-amber-500/30 disabled:opacity-50"
        >
          Ejecutar system.health
        </button>
        <button
          type="button"
          disabled={!!busy}
          onClick={() => runTool("operations_summary")}
          className="rounded-md bg-amber-500/20 px-3 py-2 text-sm text-amber-100 hover:bg-amber-500/30 disabled:opacity-50"
        >
          Ejecutar operations.summary
        </button>
        <button
          type="button"
          disabled={!!busy}
          onClick={() => runTool("tables_status")}
          className="rounded-md bg-amber-500/20 px-3 py-2 text-sm text-amber-100 hover:bg-amber-500/30 disabled:opacity-50"
        >
          Ejecutar tables.status
        </button>
        <button
          type="button"
          disabled={!!busy}
          onClick={runGeli}
          className="rounded-md border border-[#2a2f36] px-3 py-2 text-sm hover:bg-[#1a1e24] disabled:opacity-50"
        >
          Probar Geli → M&M
        </button>
        <button
          type="button"
          disabled={!!busy || !ready}
          onClick={promote}
          className="rounded-md border border-emerald-800/50 px-3 py-2 text-sm text-emerald-200 hover:bg-emerald-950/40 disabled:opacity-40"
        >
          Promover a ACTIVE
        </button>
      </div>

      {error ? <p className="text-sm text-red-300">Error: {error}</p> : null}
      {detail ? (
        <details className="rounded border border-[#2a2f36] bg-[#1a1e24] p-3 text-xs text-[#a8b0bc]">
          <summary className="cursor-pointer text-[#f3f0e8]">Ver detalle técnico</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(detail, null, 2)}</pre>
        </details>
      ) : null}
    </div>
  );
}
