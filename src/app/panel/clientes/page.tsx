import { PageTitle } from "@/components/platform/PageTitle";
import { mockClients } from "@/lib/mock/panel-data";

export default function PanelClientesPage() {
  return (
    <>
      <PageTitle title="Clientes" description="Listado demo. No representa clientes reales." />
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border bg-surface-muted text-text-secondary">
            <tr>
              <th className="px-4 py-3 font-semibold">Nombre</th>
              <th className="px-4 py-3 font-semibold">Segmento</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3 font-semibold">Proyectos</th>
            </tr>
          </thead>
          <tbody>
            {mockClients.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium text-foreground">{c.name}</td>
                <td className="px-4 py-3 text-text-secondary">{c.segment}</td>
                <td className="px-4 py-3 capitalize text-text-secondary">{c.status}</td>
                <td className="px-4 py-3 text-text-secondary">{c.projects}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
