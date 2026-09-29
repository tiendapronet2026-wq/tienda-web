import { mmControlConfigured, mmControlFetch } from "@/lib/mm-control/server";

export default async function MmGlobalDiagnosticPage() {
  const health = mmControlConfigured()
    ? await mmControlFetch<{ checks: { id: string; ok: boolean }[]; summary: string }>("/health/global")
    : null;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Diagnóstico global</h2>
      {!health?.ok ? (
        <p className="text-sm text-[#a8b0bc]">Puente M&M no disponible.</p>
      ) : (
        <>
          <p className="text-sm text-[#a8b0bc]">Sistema {health.data.summary} (sin LLM).</p>
          <ul className="divide-y divide-[#2a2f36] rounded-lg border border-[#2a2f36]">
            {health.data.checks.map((c) => (
              <li key={c.id} className="flex justify-between px-4 py-2 text-sm">
                <span>{c.id}</span>
                <span className={c.ok ? "text-emerald-400" : "text-amber-300"}>{c.ok ? "OK" : "FAIL"}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
