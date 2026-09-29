import { mmControlConfigured, mmControlFetch } from "@/lib/mm-control/server";
import { StatusPill } from "@/components/mm-control/StatusPill";

export default async function MmExecutionsPage() {
  const res = mmControlConfigured()
    ? await mmControlFetch<{
        executions: {
          id: string;
          tool_key: string;
          project: string;
          execution_status: string;
          started_at: string;
          correlation_id: string;
        }[];
      }>("/executions?limit=40")
    : null;

  const rows = res?.ok ? res.data.executions : [];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Ejecuciones</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-[#a8b0bc]">Sin ejecuciones registradas o puente no configurado.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[#2a2f36]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#14181d] text-[#a8b0bc]">
              <tr>
                <th className="px-3 py-2">Hora</th>
                <th className="px-3 py-2">Proyecto</th>
                <th className="px-3 py-2">Tool</th>
                <th className="px-3 py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-[#2a2f36]">
                  <td className="px-3 py-2 text-xs">{new Date(r.started_at).toLocaleString()}</td>
                  <td className="px-3 py-2">{r.project}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.tool_key}</td>
                  <td className="px-3 py-2">
                    <StatusPill label={r.execution_status} tone={r.execution_status === "succeeded" ? "ok" : "err"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
