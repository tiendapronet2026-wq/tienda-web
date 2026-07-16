import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { BrandLogo } from "@/components/BrandLogo";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/productos", label: "Productos" },
  { href: "/admin/categorias", label: "Categorías" },
  { href: "/admin/clientes", label: "Clientes" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAdmin();

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-border bg-surface p-6 lg:block">
          <BrandLogo variant="light" href="/admin" />
          <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-muted">
            Panel administrador
          </p>
          <nav className="mt-8 space-y-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-text-secondary transition hover:bg-surface-muted hover:text-foreground"
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
          <header className="border-b border-border bg-surface px-4 py-4 sm:px-6 lg:hidden">
            <div className="mb-3 flex items-center justify-between">
              <BrandLogo variant="light" href="/admin" />
              <Link href="/" className="text-xs font-medium text-brand">
                Ver tienda
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full border border-border px-3 py-1 text-xs font-medium text-text-secondary"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </header>
          <main className="p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
