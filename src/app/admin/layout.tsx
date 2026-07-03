import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/productos", label: "Productos" },
  { href: "/admin/categorias", label: "Categorías" },
  { href: "/admin/clientes", label: "Clientes" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAdmin();

  return (
    <div className="min-h-screen bg-zinc-100">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-zinc-200 bg-white p-6 lg:block">
          <Link href="/admin" className="text-lg font-bold">
            Admin <span className="text-emerald-600">TiendaPro</span>
          </Link>
          <nav className="mt-8 space-y-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-8 border-t border-zinc-100 pt-4 text-xs text-zinc-500">
            {profile.first_name} {profile.last_name}
          </div>
        </aside>
        <div className="flex-1">
          <header className="border-b border-zinc-200 bg-white px-4 py-4 sm:px-6 lg:hidden">
            <div className="flex flex-wrap gap-2">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium"
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
