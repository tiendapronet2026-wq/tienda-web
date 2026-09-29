export default function MmCapabilitiesPage() {
  const groups = [
    {
      title: "Casa León — Operaciones",
      items: [
        { name: "Estado del salón", state: "Disponible", risk: "low", tool: "casa_leon.tables.status" },
        { name: "Resumen operativo", state: "Disponible", risk: "low", tool: "casa_leon.operations.summary" },
      ],
    },
    {
      title: "Casa León — Sistema",
      items: [{ name: "Salud del sistema", state: "Disponible", risk: "low", tool: "casa_leon.system.health" }],
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
              <li key={i.name} className="rounded-lg border border-[#2a2f36] px-4 py-3 text-sm">
                <p className="font-medium">{i.name}</p>
                <p className="text-[#a8b0bc]">{i.state} · READ · riesgo {i.risk}</p>
                <details className="mt-1 text-xs text-[#6b7280]">
                  <summary>Detalle técnico</summary>
                  Skill: casa_leon.admin.inspect · Tool: {i.tool}
                </details>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
