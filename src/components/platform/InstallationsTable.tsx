import Link from "next/link";
import type { PlatformInstallationRow } from "@/lib/platform/installations/types";
import {
  InstallationLifecycleBadge,
  ProviderStatusPill,
} from "@/components/platform/InstallationBadges";

export function InstallationsTable({ rows }: { rows: PlatformInstallationRow[] }) {
  if (!rows.length) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-surface px-6 py-10 text-center text-sm text-text-secondary">
        Todavía no hay instalaciones registradas.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[var(--radius-xl)] border border-border bg-surface shadow-[var(--shadow-sm)]">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-border bg-surface-muted/60 text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-4 py-3">Empresa</th>
            <th className="hidden px-4 py-3 md:table-cell">Plantilla</th>
            <th className="hidden px-4 py-3 lg:table-cell">Dominio</th>
            <th className="px-4 py-3">Estado</th>
            <th className="hidden px-4 py-3 sm:table-cell">Proveedores</th>
            <th className="hidden px-4 py-3 md:table-cell">Versión</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3">
                <p className="font-semibold text-foreground">
                  {row.companyName}
                  {row.isReference ? (
                    <span className="ml-2 rounded-md bg-brand-soft px-1.5 py-0.5 text-[10px] font-bold uppercase text-brand">
                      Referencia
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-muted">{row.enabledModules.length} módulos</p>
              </td>
              <td className="hidden px-4 py-3 text-text-secondary md:table-cell">{row.templateName}</td>
              <td className="hidden px-4 py-3 text-text-secondary lg:table-cell">
                {row.primaryDomain ?? "—"}
              </td>
              <td className="px-4 py-3">
                <InstallationLifecycleBadge status={row.lifecycleStatus} />
              </td>
              <td className="hidden px-4 py-3 sm:table-cell">
                <div className="flex flex-wrap gap-1">
                  <ProviderStatusPill label="GH" status={row.githubStatus} />
                  <ProviderStatusPill label="Vercel" status={row.vercelStatus} />
                  <ProviderStatusPill label="SB" status={row.supabaseStatus} />
                </div>
              </td>
              <td className="hidden px-4 py-3 font-mono text-xs text-text-secondary md:table-cell">
                {row.installedVersion ?? "—"}
              </td>
              <td className="px-4 py-3 text-right">
                <Link href={`/control/instalaciones/${row.id}`} className="font-semibold text-brand hover:underline">
                  Abrir
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
