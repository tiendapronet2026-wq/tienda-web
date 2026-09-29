"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/control/mm", label: "Resumen" },
  { href: "/control/mm/proyectos", label: "Proyectos" },
  { href: "/control/mm/asistentes", label: "Asistentes" },
  { href: "/control/mm/capacidades", label: "Capacidades" },
  { href: "/control/mm/ejecuciones", label: "Ejecuciones" },
  { href: "/control/mm/memoria", label: "Memoria" },
  { href: "/control/mm/costos", label: "Modelos y Costos" },
  { href: "/control/mm/seguridad", label: "Seguridad" },
  { href: "/control/mm/evals", label: "Evals" },
  { href: "/control/mm/diagnostico", label: "Diagnóstico" },
  { href: "/control/mm/configuracion", label: "Configuración" },
];

export function MmShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mm-control -mx-4 min-h-[calc(100vh-8rem)] bg-[#0f1114] text-[#f3f0e8] sm:-mx-6 lg:-mx-8">
      <div className="border-b border-[#2a2f36] px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-amber-500/90">M&M</p>
            <h1 className="text-lg font-semibold text-[#f3f0e8]">Centro de Control</h1>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded border border-[#2a2f36] px-2 py-1 text-[#a8b0bc]">Producción</span>
            <span className="rounded border border-emerald-900/50 bg-emerald-950/40 px-2 py-1 text-emerald-400">
              USD 0
            </span>
          </div>
        </div>
        <nav className="mt-4 flex gap-1 overflow-x-auto pb-1">
          {nav.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/control/mm" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-md px-3 py-2 text-sm transition ${
                  active
                    ? "bg-amber-500/15 text-amber-200"
                    : "text-[#a8b0bc] hover:bg-[#1a1e24] hover:text-[#f3f0e8]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="px-4 py-6 sm:px-6 lg:px-8">{children}</div>
    </div>
  );
}
