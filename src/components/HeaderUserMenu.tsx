"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { Profile } from "@/lib/auth/session";
import { getDisplayName, getInitials } from "@/lib/auth/display";
import { signOut } from "@/app/actions/auth";

export function UserMenu({
  profile,
  email,
  isAdmin,
}: {
  profile: Profile | null;
  email?: string;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white"
        aria-label="Menú de usuario"
      >
        {getInitials(profile, email)}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-zinc-200 bg-white py-2 shadow-lg">
            <p className="border-b border-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900">
              {getDisplayName(profile, email)}
            </p>
            <MenuLink href="/mi-cuenta" onClick={() => setOpen(false)}>
              Mi cuenta
            </MenuLink>
            <MenuLink href="/mi-cuenta" onClick={() => setOpen(false)}>
              Mis pedidos
            </MenuLink>
            {isAdmin && (
              <MenuLink href="/admin" onClick={() => setOpen(false)}>
                Panel administrativo
              </MenuLink>
            )}
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(() => signOut())}
              className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              {pending ? "Cerrando..." : "Cerrar sesión"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function MenuLink({
  href,
  children,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
    >
      {children}
    </Link>
  );
}
