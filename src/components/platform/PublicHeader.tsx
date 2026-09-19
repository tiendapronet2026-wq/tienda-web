import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { ButtonLink } from "@/components/ui/Button";

const links = [
  { href: "/", label: "Inicio" },
  { href: "/servicios", label: "Servicios" },
  { href: "/modulos", label: "Módulos" },
  { href: "/demos", label: "Showroom" },
];

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-surface/90 backdrop-blur-md">
      <div className="tp-container flex h-[var(--header-h)] items-center justify-between gap-3">
        <BrandLogo variant="light" priority />
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-text-secondary transition hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <ButtonLink href="/control" size="sm" variant="outline" className="hidden sm:inline-flex">
            Control (demo)
          </ButtonLink>
          <ButtonLink href="/app" size="sm" variant="secondary">
            App cliente (demo)
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
