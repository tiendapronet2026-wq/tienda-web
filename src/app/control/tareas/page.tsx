import Link from "next/link";
import { PageTitle } from "@/components/platform/PageTitle";
import { PlatformPanelDataNotice } from "@/components/platform/PlatformPanelDataNotice";
import { OperationalTaskCreateForm } from "@/components/platform/OperationalBridgePanel";
import { mockTasks } from "@/lib/mock/panel-data";
import { loadBridgeTasks } from "@/lib/bridge/repository";
import { isExplicitDevMockMode, isTiendaProSupabaseConfigured } from "@/lib/platform/tenant-loader";
import { isBridgeApiConfigured } from "@/lib/bridge/api-auth";

export default async function ControlTareasPage() {
  const mockMode = isExplicitDevMockMode();
  const platform = isTiendaProSupabaseConfigured();
  const tasks = platform ? await loadBridgeTasks(30) : [];

  return (
    <>
      <PageTitle
        title="Tareas"
        description="Puente operativo TiendaPro — instrucciones, aprobación, historial e informe."
      />

      {mockMode ? (
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {mockTasks.map((t) => (
            <li key={t.id} className="px-4 py-4 text-sm">
              <p className="font-medium text-foreground">{t.title}</p>
              <p className="text-text-secondary">
                {t.assignee} · {t.status}
              </p>
            </li>
          ))}
        </ul>
      ) : null}

      {platform ? (
        <>
          <div className="mt-4 rounded-lg border border-brand/30 bg-brand-soft px-4 py-3 text-sm text-brand">
            Piloto: <strong>TiendaPro</strong> — repo {`tiendapronet2026-wq/tienda-web`}, Supabase{" "}
            <code className="text-xs">dnptsudsxrcamtxfiszh</code>. API bridge:{" "}
            {isBridgeApiConfigured() ? "activa (BRIDGE_API_SECRET)" : "inactiva — configurar secret en Vercel"}
          </div>

          <OperationalTaskCreateForm />

          {tasks.length ? (
            <ul className="mt-8 divide-y divide-border rounded-xl border border-border bg-surface">
              {tasks.map((t) => (
                <li key={t.id} className="px-4 py-4 text-sm">
                  <Link href={`/control/tareas/${t.id}`} className="font-medium text-brand hover:underline">
                    {t.title}
                  </Link>
                  <p className="text-text-secondary">
                    {t.status} · {t.risk_class} · {t.source}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-6 text-sm text-text-secondary">Sin tareas aún. Creá una arriba o vía API bridge.</p>
          )}
        </>
      ) : (
        !mockMode && <PlatformPanelDataNotice section="Tareas" />
      )}
    </>
  );
}
