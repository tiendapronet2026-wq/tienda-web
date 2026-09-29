export default function MmAssistantsPage() {
  return (
    <div className="space-y-6 text-sm">
      <h2 className="text-xl font-semibold">Asistentes</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-lg border border-[#2a2f36] bg-[#14181d] p-4">
          <h3 className="font-semibold text-[#f3f0e8]">Geli</h3>
          <p className="mt-1 text-[#a8b0bc]">Proyecto: Casa León · Canales: Web, Voz</p>
          <p className="mt-2">Pilot M&M: OFF (UX legacy preservada)</p>
          <p className="text-amber-200/90">Live reasoning: bloqueado por costo</p>
        </article>
        <article className="rounded-lg border border-[#2a2f36] bg-[#14181d] p-4">
          <h3 className="font-semibold text-[#f3f0e8]">M&M Console</h3>
          <p className="mt-1 text-[#a8b0bc]">Proyecto: Tienda Pro · Canal: consola</p>
        </article>
      </div>
    </div>
  );
}
