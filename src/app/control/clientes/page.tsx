import { PageTitle } from "@/components/platform/PageTitle";
import { controlTenants } from "@/lib/mock/control-data";
import Link from "next/link";

export default function ControlClientesPage() {
  return (
    <>
      <PageTitle
        title="Clientes TiendaPro"
        description="Organizaciones (tenants) que contratan SaaS — no son contactos CRM del tenant."
      />
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border bg-surface-muted text-text-secondary">
            <tr>
              <th className="px-4 py-3 font-semibold">Tenant</th>
              <th className="px-4 py-3 font-semibold">Plan</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3 font-semibold">App</th>
            </tr>
          </thead>
          <tbody>
            {controlTenants.map((t) => (
              <tr key={t.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium text-foreground">{t.name}</td>
                <td className="px-4 py-3 text-text-secondary">{t.plan}</td>
                <td className="px-4 py-3 capitalize text-text-secondary">{t.status}</td>
                <td className="px-4 py-3">
                  <Link href="/app" className="font-semibold text-brand-secondary">
                    Demo app
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
