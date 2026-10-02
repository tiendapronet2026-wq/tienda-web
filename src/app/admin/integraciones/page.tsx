import { requireAdmin } from "@/lib/auth/session";
import { IntegrationsPanel } from "@/components/admin/IntegrationsPanel";
import { listSafeConnections } from "@/lib/integrations/connections-read";

export const dynamic = "force-dynamic";

export default async function IntegracionesPage() {
  await requireAdmin();
  let connections: Awaited<ReturnType<typeof listSafeConnections>> = [];
  let loadError: string | null = null;
  try {
    connections = await listSafeConnections();
  } catch (e) {
    loadError = e instanceof Error ? e.message : "No se pudieron cargar las conexiones.";
  }

  return (
    <div>
      <h1 className="text-3xl font-bold">Integraciones</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Conectá servicios externos de forma segura. Los secretos nunca se muestran en esta pantalla.
        El checkout y los precios por canal no se modifican en este gate.
      </p>
      {loadError && (
        <p className="mt-4 rounded-lg bg-error/10 px-4 py-3 text-sm text-error">{loadError}</p>
      )}
      <div className="mt-8">
        <IntegrationsPanel connections={connections} />
      </div>
    </div>
  );
}
