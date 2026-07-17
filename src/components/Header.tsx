import Link from "next/link";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth/session";
import { getDisplayName } from "@/lib/auth/display";
import { UserMenu } from "@/components/HeaderUserMenu";
import { BrandLogo } from "@/components/BrandLogo";
import { MobileNav, type MobileNavAuth } from "@/components/MobileNav";

const desktopLinks = [
  { href: "/", label: "Inicio" },
  { href: "/productos", label: "Productos" },
  { href: "/servicios", label: "Servicios" },
  { href: "/cotizacion", label: "Cotización" },
];

export async function HeaderNav({ cartCount = 0 }: { cartCount?: number }) {
  const user = await getCurrentUser();
  const profile = await getCurrentProfile();
  const isAdmin = profile?.role === "admin" && profile.status === "active";

  const mobileAuth: MobileNavAuth = user
    ? {
        kind: "user",
        isAdmin,
        displayName: getDisplayName(profile, user.email),
      }
    : { kind: "guest" };

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-surface/90 backdrop-blur-md">
      <div className="tp-container flex h-[var(--header-h)] items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <MobileNav auth={mobileAuth} />
          <BrandLogo variant="light" priority />
        </div>

        <nav className="flex items-center gap-1 text-sm font-medium text-text-secondary sm:gap-2">
          {desktopLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hidden rounded-lg px-2.5 py-1.5 transition duration-200 hover:text-foreground sm:inline"
            >
              {link.label}
            </Link>
          ))}
          <HeaderAuthDesktop user={user} profile={profile} isAdmin={isAdmin} />
          <Link
            href="/carrito"
            className="relative ml-1 inline-flex h-10 items-center gap-2 rounded-[var(--radius-lg)] bg-brand px-3.5 text-sm font-semibold text-white shadow-[var(--shadow-sm)] transition duration-200 hover:bg-brand-hover sm:px-4"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M6 6h15l-1.5 9h-12z" />
              <circle cx="9" cy="20" r="1" />
              <circle cx="18" cy="20" r="1" />
              <path d="M6 6L5 3H2" />
            </svg>
            <span className="sr-only sm:not-sr-only sm:inline">Carrito</span>
            {cartCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-hero px-1 text-[11px] font-bold text-white">
                {cartCount}
              </span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}

function HeaderAuthDesktop({
  user,
  profile,
  isAdmin,
}: {
  user: Awaited<ReturnType<typeof getCurrentUser>>;
  profile: Awaited<ReturnType<typeof getCurrentProfile>>;
  isAdmin: boolean;
}) {
  if (!user) {
    return (
      <div className="hidden items-center gap-1 sm:flex">
        <Link
          href="/login"
          className="rounded-lg px-2.5 py-1.5 transition duration-200 hover:text-foreground"
        >
          Iniciar sesión
        </Link>
        <Link
          href="/registro"
          className="rounded-[var(--radius-lg)] border border-border px-3.5 py-2 transition duration-200 hover:border-brand hover:text-brand"
        >
          Crear cuenta
        </Link>
      </div>
    );
  }

  return (
    <div className="hidden sm:block">
      <UserMenu profile={profile} email={user.email} isAdmin={isAdmin} />
    </div>
  );
}
