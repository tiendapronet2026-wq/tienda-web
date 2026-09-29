export default function MmSecurityPage() {
  const items = [
    ["Project isolation", "Evals piloto PASS"],
    ["Cross-project leakage", "Bloqueado por Skill Broker"],
    ["Arbitrary SQL", "NO"],
    ["Arbitrary HTTP", "NO"],
    ["Automatic paid spend", "Bloqueado"],
    ["Casa León writes", "NO"],
    ["Darwin", "Congelado"],
    ["Secrets en browser", "NO"],
  ];
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Seguridad</h2>
      <ul className="divide-y divide-[#2a2f36] rounded-lg border border-[#2a2f36]">
        {items.map(([k, v]) => (
          <li key={k} className="flex justify-between px-4 py-3 text-sm">
            <span>{k}</span>
            <span className="text-emerald-400">{v}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
