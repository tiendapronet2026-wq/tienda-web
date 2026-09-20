import Link from "next/link";
import { notFound } from "next/navigation";
import { PageTitle } from "@/components/platform/PageTitle";
import { loadInstallationOperations, loadPlatformInstallationById } from "@/lib/platform/installations/loader";

export default async function InstalacionOperacionesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const installation = await loadPlatformInstallationById(id);
  if (!installation) notFound();
  const operations = await loadInstallationOperations(id);

  return (
    <>
      <Link href={`/control/instalaciones/${id}`} className="text-sm font-semibold text-brand hover:underline">
        ← {installation.companyName}
      </Link>
      <PageTitle
        title="Historial de operaciones"
        description="Auditoría por instalación. Sin SQL arbitrario ni acciones destructivas automáticas."
      />
      <div className="mt-4">
      {!operations.length ? (
        <p className="mt-6 text-sm text-muted">Sin operaciones registradas.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-muted/60 text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Resumen</th>
              </tr>
            </thead>
            <tbody>
              {operations.map((op) => (
                <tr key={op.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-text-secondary">
                    {new Date(op.createdAt).toLocaleString("es-AR")}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{op.operationType}</td>
                  <td className="px-4 py-3">{op.status}</td>
                  <td className="px-4 py-3">{op.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </>
  );
}
