export default function MmConfigPage() {
  return (
    <div className="space-y-4 text-sm text-[#a8b0bc]">
      <h2 className="text-xl font-semibold text-[#f3f0e8]">Configuración</h2>
      <p>Secrets (solo estado, nunca valores):</p>
      <ul className="divide-y divide-[#2a2f36] rounded-lg border border-[#2a2f36]">
        {["MM_GELI_CHANNEL_SECRET", "MM_CASA_LEON_GATEWAY_SECRET", "CASA_LEON_GATEWAY_URL", "MM control bridge"].map(
          (s) => (
            <li key={s} className="flex justify-between px-4 py-2">
              <span>{s}</span>
              <span className="text-[#a8b0bc]">Estado en runtime M&M (sin valor)</span>
            </li>
          )
        )}
      </ul>
      <p className="text-xs">Tienda Pro usa únicamente el puente server-side hacia M&M.</p>
    </div>
  );
}
