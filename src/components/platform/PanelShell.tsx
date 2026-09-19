"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MockBadge } from "@/components/platform/MockBadge";

const nav = [
  { href: "/panel", label: "Resumen", icon: "◉" },
  { href: "/panel/clientes", label: "Clientes", icon: "◎" },
  { href: "/panel/proyectos", label: "Proyectos", icon: "▣" },
  { href: "/panel/tareas", label: "Tareas", icon: "☑" },
  { href: "/panel/agentes", label: "Agentes", icon: "⚡" },
  { href: "/panel/informes", label: "Informes", icon: "▤" },
  { href: "/panel/configuracion", label: "Configuración", icon: "⚙" },
];

export function PanelShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="border-b border-border bg-surface lg:border-b-0 lg:border-r">
        <div className="flex h-[var(--header-h)] items-center justify-between px-4 lg:px-5">
          <Link href="/" className="text-sm font-bold text-foreground">
            TiendaPro
          </Link>
          <MockBadge className="hidden sm:inline-flex" />
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-3 lg:flex-col lg:overflow-visible lg:px-3 lg:pb-6">
          {nav.map((item) => {
            const active = pathname === item.href || (item.href !== "/panel" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-brand-soft text-brand"
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
          <p className="text-xs text-text-secondary">
            Panel privado · <span className="font-semibold text-warning">modo demostración</span> · sin Supabase en
            vivo
          </p>
        </header>
        <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </div>
    </div>
  );
}
