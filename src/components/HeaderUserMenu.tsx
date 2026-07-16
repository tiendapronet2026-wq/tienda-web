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
        className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-xs font-bold text-white"
        aria-label="Menú de usuario"
      >
        {getInitials(profile, email)}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-border bg-surface py-2 shadow-lg">
            <p className="border-b border-border px-4 py-2 text-sm font-medium text-foreground">
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
              className="block w-full px-4 py-2 text-left text-sm text-error hover:bg-error-soft disabled:opacity-60"
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
      className="block px-4 py-2 text-sm text-text-secondary hover:bg-surface-muted"
    >
      {children}
    </Link>
  );
}
