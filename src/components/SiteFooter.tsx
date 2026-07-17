import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

const links = [
  { href: "/", label: "Inicio" },
  { href: "/productos", label: "Productos" },
  { href: "/servicios", label: "Servicios" },
  { href: "/cotizacion", label: "Solicitar cotización" },
  { href: "/login", label: "Login" },
  { href: "/registro", label: "Registro" },
];

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-background-dark text-white">
      <div className="tp-container grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr]">
        <div className="max-w-md">
          <BrandLogo variant="dark" href="/" />
          <p className="mt-4 text-sm leading-relaxed text-white/65">
            TiendaPro reúne productos, impresión y soluciones personalizadas para transformar ideas
            en proyectos reales.
          </p>
          <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/70">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-accent" aria-hidden />
            Etapa beta · Compras online próximamente
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Explorar</p>
          <nav className="mt-4 flex flex-col gap-2.5 text-sm text-white/70">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="transition duration-200 hover:text-white">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="tp-container flex flex-col gap-2 py-5 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} TiendaPro. Todos los derechos reservados.</p>
          <p>Productos y soluciones personalizadas.</p>
        </div>
      </div>
    </footer>
  );
}
