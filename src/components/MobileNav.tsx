"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { signOut } from "@/app/actions/auth";

export type MobileNavAuth =
  | { kind: "guest" }
  | {
      kind: "user";
      isAdmin: boolean;
      displayName: string;
    };

export function MobileNav({ auth }: { auth: MobileNavAuth }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus first link in panel
    const firstLink = panelRef.current?.querySelector<HTMLElement>("a, button");
    firstLink?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function close() {
    setOpen(false);
  }

  return (
    <div className="sm:hidden">
      <button
        ref={buttonRef}
        type="button"
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-foreground transition hover:border-brand hover:text-brand"
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-hero/40"
            aria-hidden="true"
            onClick={close}
          />
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-modal="true"
            aria-label="Menú de navegación"
            className="fixed inset-x-0 top-[3.75rem] z-[70] mx-3 max-h-[calc(100dvh-5rem)] overflow-y-auto rounded-2xl border border-border bg-surface p-3 shadow-lg"
          >
            <nav className="flex flex-col gap-1 text-sm font-medium text-text-secondary">
              <MobileLink href="/" onClick={close}>
                Inicio
              </MobileLink>
              <MobileLink href="/productos" onClick={close}>
                Productos
              </MobileLink>
              <MobileLink href="/carrito" onClick={close}>
                Carrito
              </MobileLink>

              <div className="my-2 border-t border-border" />

              {auth.kind === "guest" ? (
                <>
                  <MobileLink href="/login" onClick={close}>
                    Iniciar sesión
                  </MobileLink>
                  <MobileLink href="/registro" onClick={close}>
                    Registro
                  </MobileLink>
                </>
              ) : (
                <>
                  <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
                    {auth.displayName}
                  </p>
                  <MobileLink href="/mi-cuenta" onClick={close}>
                    Mi cuenta
                  </MobileLink>
                  {auth.isAdmin && (
                    <MobileLink href="/admin" onClick={close}>
                      Panel administrador
                    </MobileLink>
                  )}
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      close();
                      startTransition(() => signOut());
                    }}
                    className="rounded-xl px-3 py-2.5 text-left text-error transition hover:bg-error-soft disabled:opacity-60"
                  >
                    {pending ? "Cerrando..." : "Cerrar sesión"}
                  </button>
                </>
              )}
            </nav>
          </div>
        </>
      )}
    </div>
  );
}

function MobileLink({
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
      className="rounded-xl px-3 py-2.5 transition hover:bg-brand-soft hover:text-brand"
    >
      {children}
    </Link>
  );
}
