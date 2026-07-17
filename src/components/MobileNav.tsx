"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
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
  const [mounted, setMounted] = useState(false);
  const [pending, startTransition] = useTransition();
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const menu =
    open && mounted
      ? createPortal(
          <>
            <div
              className="fixed inset-0 z-[100] bg-background-dark/45 backdrop-blur-[2px]"
              aria-hidden="true"
              onClick={close}
            />
            <div
              ref={panelRef}
              id={panelId}
              role="dialog"
              aria-modal="true"
              aria-label="Menú de navegación"
              className="fixed inset-y-0 left-0 z-[110] flex w-[min(100vw-3rem,20rem)] flex-col border-r border-border bg-surface p-4 shadow-[var(--shadow-lg)] tp-fade-up"
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Menú</p>
                <button
                  type="button"
                  onClick={close}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border border-border text-foreground transition hover:border-brand hover:text-brand"
                  aria-label="Cerrar menú"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
              <nav className="flex flex-col gap-1 text-sm font-medium text-text-secondary">
                <MobileLink href="/" onClick={close}>
                  Inicio
                </MobileLink>
                <MobileLink href="/productos" onClick={close}>
                  Productos
                </MobileLink>
                <MobileLink href="/servicios" onClick={close}>
                  Servicios
                </MobileLink>
                <MobileLink href="/cotizacion" onClick={close}>
                  Solicitar cotización
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
                    <MobileLink href="/mi-cuenta/cotizaciones" onClick={close}>
                      Mis cotizaciones
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
          </>,
          document.body
        )
      : null;

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
      {menu}
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
