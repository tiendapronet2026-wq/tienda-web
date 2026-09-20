"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/app", label: "Resumen", icon: "◉" },
  { href: "/app/modulos", label: "Módulos", icon: "◫" },
  { href: "/app/clientes", label: "CRM", icon: "◎" },
  { href: "/app/informes", label: "Informes", icon: "▤" },
  { href: "/app/asistente", label: "Asistente", icon: "💬" },
  { href: "/app/configuracion", label: "Configuración", icon: "⚙" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="border-b border-border bg-surface lg:border-b-0 lg:border-r">
        <div className="flex h-[var(--header-h)] flex-col justify-center px-4 lg:px-5">
          <Link href="/" className="text-sm font-bold text-foreground">
            App cliente
          </Link>
          <p className="text-[11px] text-muted">SaaS tenant · sesión requerida</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-3 lg:flex-col lg:overflow-visible lg:px-3 lg:pb-6">
          {nav.map((item) => {
            const active = pathname === item.href || (item.href !== "/app" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-brand-secondary-soft text-brand-secondary"
                    : "text-text-secondary hover:bg-surface-muted hover:text-foreground"
                }`}
              >
                <span className="mr-2 opacity-70" aria-hidden>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="border-b border-border bg-surface/80 px-4 py-3 sm:px-6">
          <p className="text-xs text-text-secondary">App cliente · acceso privado · membresía tenant</p>
        </header>
        <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </div>
    </div>
  );
}
