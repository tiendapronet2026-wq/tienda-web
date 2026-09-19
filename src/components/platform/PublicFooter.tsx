import Link from "next/link";

const footerLinks = [
  { href: "/servicios", label: "Servicios" },
  { href: "/demos", label: "Demos interactivas" },
  { href: "/panel", label: "Panel (demo)" },
];

export function PublicFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="tp-container grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="text-lg font-bold text-foreground">TiendaPro</p>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">
            Plataforma comercial y centro de operaciones multiproyecto. Demos con datos ficticios hasta conectar
            producción.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Explorar</p>
          <ul className="mt-3 space-y-2">
            {footerLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-sm text-text-secondary hover:text-brand">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Contacto comercial</p>
          <p className="mt-3 text-sm text-text-secondary">
            <a href="mailto:hola@tiendapro.net" className="font-medium text-brand hover:underline">
              hola@tiendapro.net
            </a>
          </p>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted">
        © {new Date().getFullYear()} TiendaPro · TiendaPro 3.0 en reconstrucción
      </div>
    </footer>
  );
}
