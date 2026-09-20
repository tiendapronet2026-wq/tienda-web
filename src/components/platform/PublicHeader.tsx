import Link from "next/link";
import type { StoreBrandingConfig } from "@/lib/branding/types";
import { BrandLogo } from "@/components/BrandLogo";
import { ButtonLink } from "@/components/ui/Button";

const links = [
  { href: "/", label: "Inicio" },
  { href: "/servicios", label: "Servicios" },
  { href: "/modulos", label: "Módulos" },
  { href: "/demos", label: "Showroom" },
];

export function PublicHeader({ branding }: { branding: StoreBrandingConfig }) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-surface/90 backdrop-blur-md">
      <div className="tp-container flex h-[var(--header-h)] items-center justify-between gap-3">
        <BrandLogo variant="light" priority branding={branding} />
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
          {branding.platformMode ? (
            <>
              <ButtonLink href="/login?redirect=/control" size="sm" variant="outline" className="hidden sm:inline-flex">
                Control
              </ButtonLink>
              <ButtonLink href="/login?redirect=/app" size="sm" variant="secondary">
                App cliente
              </ButtonLink>
            </>
          ) : (
            <ButtonLink href="/login?redirect=/productos" size="sm" variant="secondary">
              Mi cuenta
            </ButtonLink>
          )}
        </div>
      </div>
    </header>
  );
}
