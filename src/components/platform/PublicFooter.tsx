import Link from "next/link";
import type { StoreBrandingConfig } from "@/lib/branding/types";

const platformFooterLinks = [
  { href: "/servicios", label: "Servicios" },
  { href: "/modulos", label: "Módulos" },
  { href: "/demos", label: "Showroom" },
  { href: "/control", label: "Control (demo)" },
  { href: "/app", label: "App cliente (demo)" },
];

const storeFooterLinks = [
  { href: "/productos", label: "Productos" },
  { href: "/carrito", label: "Carrito" },
  { href: "/login", label: "Iniciar sesión" },
];

export function PublicFooter({ branding }: { branding: StoreBrandingConfig }) {
  const links = branding.platformMode ? platformFooterLinks : storeFooterLinks;
  return (
    <footer className="border-t border-border bg-surface">
      <div className="tp-container grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="text-lg font-bold text-foreground">{branding.brandName}</p>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">{branding.tagline}</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Explorar</p>
          <ul className="mt-3 space-y-2">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-sm text-text-secondary hover:text-brand">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Contacto</p>
          <p className="mt-3 text-sm text-text-secondary">
            <a href={`mailto:${branding.contactEmail}`} className="font-medium text-brand hover:underline">
              {branding.contactEmail}
            </a>
          </p>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted">
        © {new Date().getFullYear()} {branding.brandName}
        {branding.platformMode ? " · TiendaPro 3.0" : ""}
      </div>
    </footer>
  );
}
