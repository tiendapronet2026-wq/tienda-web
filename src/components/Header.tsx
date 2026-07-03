import Link from "next/link";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth/session";
import { UserMenu } from "@/components/HeaderUserMenu";

export function HeaderNav({ cartCount = 0 }: { cartCount?: number }) {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="text-xl font-bold tracking-tight text-zinc-900">
          Tienda<span className="text-emerald-600">Pro</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm font-medium text-zinc-600 sm:gap-6">
          <Link href="/productos" className="transition hover:text-zinc-900">
            Productos
          </Link>
          <HeaderAuth />
          <Link
            href="/carrito"
            className="relative rounded-full bg-zinc-900 px-4 py-2 text-white transition hover:bg-zinc-700"
          >
            Carrito
            {cartCount > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1 text-xs font-bold text-white">
                {cartCount}
              </span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}

async function HeaderAuth() {
  const user = await getCurrentUser();
  const profile = await getCurrentProfile();

  if (!user) {
    return (
      <div className="hidden items-center gap-3 sm:flex">
        <Link href="/login" className="transition hover:text-zinc-900">
          Iniciar sesión
        </Link>
        <Link
          href="/registro"
          className="rounded-full border border-zinc-200 px-3 py-1.5 transition hover:border-emerald-500 hover:text-emerald-600"
        >
          Crear cuenta
        </Link>
      </div>
    );
  }

  return (
    <UserMenu
      profile={profile}
      email={user.email}
      isAdmin={profile?.role === "admin" && profile.status === "active"}
    />
  );
}
