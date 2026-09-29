export default function MmCapabilitiesPage() {
  const groups = [
    {
      title: "Casa León — Rendimiento",
      items: [
        { name: "Ventas del período", state: "Disponible", risk: "low", cap: "READ", tool: "casa_leon.sales.summary", skill: "casa_leon.performance.inspect" },
        { name: "Rendimiento por canal", state: "Disponible", risk: "low", cap: "READ", tool: "casa_leon.sales.by_channel", skill: "casa_leon.performance.inspect" },
        { name: "Productos más vendidos", state: "Disponible", risk: "low", cap: "READ", tool: "casa_leon.sales.top_products", skill: "casa_leon.performance.inspect" },
        { name: "Rendimiento por horario", state: "Disponible", risk: "low", cap: "READ", tool: "casa_leon.sales.by_hour", skill: "casa_leon.performance.inspect" },
      ],
    },
    {
      title: "Casa León — Operaciones",
      items: [
        { name: "Resumen de pedidos", state: "Disponible", risk: "low", cap: "READ", tool: "casa_leon.orders.summary", skill: "casa_leon.performance.inspect" },
        { name: "Actividad del salón", state: "Disponible", risk: "low", cap: "READ", tool: "casa_leon.tables.activity", skill: "casa_leon.performance.inspect" },
        { name: "Anomalías operativas", state: "Disponible", risk: "low", cap: "ANALYZE", tool: "casa_leon.operations.anomalies", skill: "casa_leon.operations.analyze" },
        { name: "Estado del salón", state: "Disponible", risk: "low", cap: "READ", tool: "casa_leon.tables.status", skill: "casa_leon.admin.inspect" },
        { name: "Resumen operativo", state: "Disponible", risk: "low", cap: "READ", tool: "casa_leon.operations.summary", skill: "casa_leon.admin.inspect" },
      ],
    },
    {
      title: "Casa León — Sistema",
      items: [{ name: "Salud del sistema", state: "Disponible", risk: "low", cap: "READ", tool: "casa_leon.system.health", skill: "casa_leon.admin.inspect" }],
    },
  ];
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Capacidades</h2>
      {groups.map((g) => (
        <section key={g.title}>
          <h3 className="text-sm font-medium uppercase tracking-wide text-[#a8b0bc]">{g.title}</h3>
          <ul className="mt-2 space-y-2">
            {g.items.map((i) => (
              <li key={i.tool} className="rounded-lg border border-[#2a2f36] px-4 py-3 text-sm">
                <p className="font-medium">{i.name}</p>
                <p className="text-[#a8b0bc]">{i.state} · {i.cap} · riesgo {i.risk} · Verify · Receipt</p>
                <details className="mt-1 text-xs text-[#6b7280]">
                  <summary>Detalle técnico</summary>
                  Skill: {i.skill} · Tool: {i.tool}
                </details>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
