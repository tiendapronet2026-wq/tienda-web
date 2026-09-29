export default function MmCostPage() {
  return (
    <div className="max-w-2xl space-y-4 text-sm text-[#a8b0bc]">
      <h2 className="text-xl font-semibold text-[#f3f0e8]">Modelos y Costos</h2>
      <div className="rounded-lg border border-amber-900/40 bg-amber-950/20 p-4 text-amber-100">
        <p className="font-medium">STOP_COST_AUTHORIZATION_REQUIRED</p>
        <p className="mt-2">
          M&M puede tener el provider Workers AI configurado técnicamente, pero{" "}
          <strong>no tiene autorización económica</strong> para usarlo.
        </p>
      </div>
      <ul className="space-y-2">
        <li>Provider configured: según health M&M (sin gasto)</li>
        <li>Economic state: <strong>UNKNOWN</strong></li>
        <li>Auto paid spend: <strong>NO</strong></li>
        <li>Límite autorizado: $0</li>
        <li>Gasto hoy: $0</li>
      </ul>
      <p>No hay botón “Activar IA” en V1. La autorización económica es un acto humano explícito aparte.</p>
    </div>
  );
}
