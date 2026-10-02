import { requireAdmin } from "@/lib/auth/session";
import { IntegrationsPanel } from "@/components/admin/IntegrationsPanel";
import { listSafeConnections } from "@/lib/integrations/integration-service";

export default async function IntegracionesPage() {
  await requireAdmin();
  const connections = await listSafeConnections();

  return (
    <div>
      <h1 className="text-3xl font-bold">Integraciones</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Conectá servicios externos de forma segura. Los secretos nunca se muestran en esta pantalla.
        El checkout y los precios por canal no se modifican en este gate.
      </p>
      <div className="mt-8">
        <IntegrationsPanel connections={connections} />
      </div>
    </div>
  );
}
