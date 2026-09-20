import Link from "next/link";
import { PageTitle } from "@/components/platform/PageTitle";
import { PersistenceSourceBadge } from "@/components/platform/PersistenceSourceBadge";
import { InstallationsTable } from "@/components/platform/InstallationsTable";
import { ButtonLink } from "@/components/ui/Button";
import { isExplicitDevMockMode } from "@/lib/platform/tenant-loader";
import { loadPlatformInstallations } from "@/lib/platform/installations/loader";

export default async function ControlInstalacionesPage() {
  const mockMode = isExplicitDevMockMode();
  const { source, installations } = await loadPlatformInstallations();
  const liveCount = installations.filter((i) => i.lifecycleStatus === "live").length;

  return (
    <>
      {!mockMode ? <PersistenceSourceBadge source={source} /> : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageTitle
          title="Central de instalaciones"
          description="Fábrica de sistemas: cada cliente con GitHub, Vercel, Supabase y dominio propios. TiendaPro Control administra; la app del cliente opera de forma aislada."
        />
        <ButtonLink href="/control/instalaciones/nueva" size="lg">
          Nueva instalación
        </ButtonLink>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-4 shadow-[var(--shadow-sm)]">
          <p className="text-xs font-semibold uppercase text-muted">Instalaciones</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{installations.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 shadow-[var(--shadow-sm)]">
          <p className="text-xs font-semibold uppercase text-muted">En producción</p>
          <p className="mt-1 text-2xl font-bold text-brand">{liveCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 shadow-[var(--shadow-sm)]">
          <p className="text-xs font-semibold uppercase text-muted">Referencia</p>
          <p className="mt-1 text-sm font-medium text-foreground">TiendaPro · www.tiendapro.net</p>
        </div>
      </div>

      <div className="mt-8">
        <InstallationsTable rows={installations} />
      </div>

      <p className="mt-6 text-sm text-text-secondary">
        ¿Buscabas despliegues legacy?{" "}
        <Link href="/control/despliegues" className="font-semibold text-brand hover:underline">
          Ver notas técnicas
        </Link>
      </p>
    </>
  );
}
