"use client";

import { useMemo, useState } from "react";
import { mockStoreProducts } from "@/lib/mock/demos";
import { Button } from "@/components/ui/Button";
import { MockBadge } from "@/components/platform/MockBadge";

export function DemoStorefront() {
  const [category, setCategory] = useState<string>("Todos");
  const categories = useMemo(
    () => ["Todos", ...new Set(mockStoreProducts.map((p) => p.category))],
    []
  );
  const filtered = category === "Todos" ? mockStoreProducts : mockStoreProducts.filter((p) => p.category === category);

  return (
    <div className="space-y-4">
      <MockBadge />
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              category === c ? "bg-brand text-white" : "bg-surface-muted text-text-secondary"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {filtered.map((p) => (
          <li key={p.id} className="rounded-xl border border-border bg-surface p-4">
            <p className="font-semibold text-foreground">{p.name}</p>
            <p className="text-sm text-text-secondary">{p.category}</p>
            <p className="mt-2 text-lg font-bold text-brand">${p.price.toLocaleString("es-AR")}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DemoPos() {
  const [cart, setCart] = useState<{ name: string; price: number }[]>([]);
  const items = [
    { name: "Café demo", price: 2500 },
    { name: "Medialuna demo", price: 1200 },
    { name: "Servicio digital demo", price: 15000 },
  ];
  const total = cart.reduce((s, i) => s + i.price, 0);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <MockBadge />
        <p className="mt-3 text-sm text-text-secondary">Tocá para agregar al ticket ficticio.</p>
        <ul className="mt-4 space-y-2">
          {items.map((item) => (
            <li key={item.name}>
              <Button
                type="button"
                variant="outline"
                fullWidth
                className="justify-between"
                onClick={() => setCart((c) => [...c, item])}
              >
                <span>{item.name}</span>
                <span>${item.price.toLocaleString("es-AR")}</span>
              </Button>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-xl border border-border bg-surface p-5">
        <h3 className="font-semibold text-foreground">Ticket demo</h3>
        <ul className="mt-3 space-y-1 text-sm text-text-secondary">
          {cart.length === 0 && <li>Sin ítems</li>}
          {cart.map((c, i) => (
            <li key={`${c.name}-${i}`}>
              {c.name} — ${c.price.toLocaleString("es-AR")}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xl font-bold text-foreground">Total: ${total.toLocaleString("es-AR")}</p>
        <Button type="button" className="mt-4" disabled={!cart.length} onClick={() => setCart([])}>
          Cerrar venta (simulada)
        </Button>
      </div>
    </div>
  );
}

export function DemoChatbot() {
  const [input, setInput] = useState("");
  const [log, setLog] = useState<{ role: "user" | "system"; text: string }[]>([
    { role: "system", text: "Demo local. Probá: «generar informe» o «listar clientes»." },
  ]);

  async function send() {
    if (!input.trim()) return;
    const userText = input.trim();
    setInput("");
    setLog((l) => [...l, { role: "user", text: userText }]);
    const { runAgentPipeline } = await import("@/lib/agents/pipeline");
    const { reply } = runAgentPipeline(userText);
    setLog((l) => [...l, { role: "system", text: reply }]);
  }

  return (
    <div className="flex flex-col gap-3">
      <MockBadge />
      <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-border bg-surface p-4">
        {log.map((m, i) => (
          <p key={i} className={`text-sm ${m.role === "user" ? "text-foreground" : "text-text-secondary"}`}>
            <span className="font-semibold">{m.role === "user" ? "Vos" : "Motor demo"}:</span> {m.text}
          </p>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Escribí un mensaje demo…"
          className="h-11 flex-1 rounded-lg border border-border bg-surface px-3 text-sm"
        />
        <Button type="button" onClick={send}>
          Enviar
        </Button>
      </div>
    </div>
  );
}

export function DemoDashboard() {
  return (
    <div className="space-y-4">
      <MockBadge />
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Ventas demo", value: "$ 1.2M" },
          { label: "Tickets demo", value: "348" },
          { label: "Conversión demo", value: "3.8%" },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-surface p-4">
            <p className="text-sm text-text-secondary">{k.label}</p>
            <p className="text-2xl font-bold text-foreground">{k.value}</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-text-secondary">Gráficos y exportación real se conectarán en fases posteriores.</p>
    </div>
  );
}
