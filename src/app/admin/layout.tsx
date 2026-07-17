import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { BrandLogo } from "@/components/BrandLogo";
import { Badge } from "@/components/ui/Badge";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/productos", label: "Productos" },
  { href: "/admin/categorias", label: "Categorías" },
  { href: "/admin/cotizaciones", label: "Cotizaciones" },
  { href: "/admin/clientes", label: "Clientes" },
];

const costLinks = [
  { href: "/admin/costos", label: "Dashboard de costos" },
  { href: "/admin/proveedores", label: "Proveedores" },
  { href: "/admin/materiales", label: "Materiales" },
  { href: "/admin/maquinas", label: "Máquinas" },
  { href: "/admin/mano-de-obra", label: "Mano de obra" },
  { href: "/admin/configuracion/costos", label: "Configuración" },
  { href: "/admin/costos/auditoria", label: "Auditoría" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAdmin();

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-border bg-surface p-6 shadow-[var(--shadow-sm)] lg:block">
          <BrandLogo variant="light" href="/admin" />
          <div className="mt-3">
            <Badge tone="beta">Admin</Badge>
          </div>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted">
            Panel administrador
          </p>
          <nav className="mt-8 space-y-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium text-text-secondary transition hover:bg-brand-soft hover:text-brand"
              >
                {link.label}
              </Link>
            ))}
            <p className="px-3 pb-1 pt-5 text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
              Costos y producción
            </p>
            {costLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium text-text-secondary transition hover:bg-brand-soft hover:text-brand"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-8 border-t border-border pt-4 text-xs text-muted">
            {profile.first_name} {profile.last_name}
          </div>
          <Link href="/" className="mt-3 inline-block text-xs font-medium text-brand hover:underline">
            Ver tienda
          </Link>
        </aside>
        <div className="flex-1">
          <header className="border-b border-border bg-surface px-4 py-4 shadow-[var(--shadow-sm)] sm:px-6 lg:hidden">
            <div className="mb-3 flex items-center justify-between">
              <BrandLogo variant="light" href="/admin" />
              <Link href="/" className="text-xs font-medium text-brand">
                Ver tienda
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {[...links, ...costLinks].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition hover:border-brand hover:text-brand"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </header>
          <main className="p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
