import Link from "next/link";
import { notFound } from "next/navigation";
import { PageTitle } from "@/components/platform/PageTitle";
import {
  InstallationLifecycleBadge,
  ProviderStatusPill,
} from "@/components/platform/InstallationBadges";
import { ButtonLink } from "@/components/ui/Button";
import { MODULE_REGISTRY, type ModuleId } from "@/lib/modules/registry";
import {
  loadInstallationOperations,
  loadPlatformInstallationById,
} from "@/lib/platform/installations/loader";

export default async function InstalacionDetallePage({
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
      <Link href="/control/instalaciones" className="text-sm font-semibold text-brand hover:underline">
        ← Instalaciones
      </Link>
      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <PageTitle title={installation.companyName} description={`Slug ${installation.companySlug}`} />
        <InstallationLifecycleBadge status={installation.lifecycleStatus} />
      </div>

      {installation.isReference ? (
        <p className="mt-4 rounded-lg border border-brand/30 bg-brand-soft px-4 py-3 text-sm text-brand">
          Instalación de referencia: no se modifican credenciales ni checkout desde Control.
        </p>
      ) : null}

      <dl className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-4">
          <dt className="text-xs font-semibold uppercase text-muted">Dominio</dt>
          <dd className="mt-1 font-medium text-foreground">{installation.primaryDomain ?? "—"}</dd>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <dt className="text-xs font-semibold uppercase text-muted">Plantilla</dt>
          <dd className="mt-1 font-medium text-foreground">{installation.templateName}</dd>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <dt className="text-xs font-semibold uppercase text-muted">Versión</dt>
          <dd className="mt-1 font-mono text-sm">{installation.installedVersion ?? "—"}</dd>
        </div>
      </dl>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-foreground">Proveedores</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <ProviderStatusPill label="GitHub" status={installation.githubStatus} />
          <ProviderStatusPill label="Vercel" status={installation.vercelStatus} />
          <ProviderStatusPill label="Supabase" status={installation.supabaseStatus} />
        </div>
        <ul className="mt-4 space-y-1 text-sm text-text-secondary">
          {installation.githubMeta.repo ? <li>Repo: {String(installation.githubMeta.repo)}</li> : null}
          {installation.vercelMeta.project ? <li>Vercel: {String(installation.vercelMeta.project)}</li> : null}
          {installation.supabaseMeta.project_ref ? (
            <li>Supabase ref: {String(installation.supabaseMeta.project_ref)}</li>
          ) : null}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-foreground">Módulos instalados</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {installation.enabledModules.map((mid) => (
            <li
              key={mid}
              className="rounded-lg border border-border bg-surface-muted px-3 py-1 text-sm font-medium"
            >
              {MODULE_REGISTRY[mid as ModuleId]?.name ?? mid}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 flex flex-wrap gap-3">
        <ButtonLink href={`/control/instalaciones/${id}/operaciones`} variant="outline">
          Historial de operaciones
        </ButtonLink>
        <ButtonLink href="/control/instalaciones/nueva" variant="outline">
          Nueva instalación
        </ButtonLink>
        {installation.primaryDomain ? (
          <a
            href={`https://${installation.primaryDomain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center rounded-[var(--radius-lg)] border border-border px-5 text-sm font-semibold text-foreground hover:border-brand"
          >
            Abrir sitio
          </a>
        ) : null}
      </section>

      {operations.length ? (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-foreground">Últimas operaciones</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {operations.slice(0, 3).map((op) => (
              <li key={op.id} className="rounded-lg border border-border px-3 py-2">
                <span className="font-medium">{op.operationType}</span> · {op.summary}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
