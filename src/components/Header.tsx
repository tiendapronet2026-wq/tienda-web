import Link from "next/link";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth/session";
import { getDisplayName } from "@/lib/auth/display";
import { UserMenu } from "@/components/HeaderUserMenu";
import { BrandLogo } from "@/components/BrandLogo";
import { MobileNav, type MobileNavAuth } from "@/components/MobileNav";

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
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex min-w-0 items-center gap-2">
          <MobileNav auth={mobileAuth} />
          <BrandLogo variant="light" priority />
        </div>

        <nav className="flex items-center gap-3 text-sm font-medium text-text-secondary sm:gap-5">
          <Link href="/productos" className="hidden transition hover:text-foreground sm:inline">
            Productos
          </Link>
          <HeaderAuthDesktop user={user} profile={profile} isAdmin={isAdmin} />
          <Link
            href="/carrito"
            className="relative rounded-xl bg-hero px-3.5 py-2 text-white transition hover:bg-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-secondary sm:px-4"
          >
            Carrito
            {cartCount > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-xs font-bold text-white">
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
      <div className="hidden items-center gap-3 sm:flex">
        <Link href="/login" className="transition hover:text-foreground">
          Iniciar sesión
        </Link>
        <Link
          href="/registro"
          className="rounded-xl border border-border px-3 py-1.5 transition hover:border-brand hover:text-brand"
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
