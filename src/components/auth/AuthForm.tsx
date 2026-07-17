"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/Button";

type AuthFormProps = {
  title: string;
  subtitle?: string;
  action: (formData: FormData) => Promise<{ error?: string; success?: string } | void>;
  children: React.ReactNode;
  submitLabel: string;
  footer?: React.ReactNode;
  hiddenFields?: Record<string, string>;
};

export function AuthForm({
  title,
  subtitle,
  action,
  children,
  submitLabel,
  footer,
  hiddenFields,
}: AuthFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="relative min-h-[70vh] overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(8,96,232,0.08),_transparent_45%),radial-gradient(ellipse_at_bottom_left,_rgba(10,143,92,0.08),_transparent_40%)]"
        aria-hidden
      />
      <div className="tp-container relative grid items-center gap-10 py-12 lg:grid-cols-2 lg:py-16">
        <div className="hidden lg:block">
          <div className="relative overflow-hidden rounded-[1.5rem] border border-border bg-background-dark p-10 text-white shadow-[var(--shadow-lg)]">
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(0,180,216,0.25),_transparent_45%),radial-gradient(circle_at_bottom_left,_rgba(10,143,92,0.25),_transparent_40%)]"
              aria-hidden
            />
            <div className="relative">
              <BrandLogo variant="dark" href="/" />
              <h2 className="mt-8 text-3xl font-bold tracking-tight">
                Una cuenta clara para explorar y organizar tus productos.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-white/70">
                Accedé a tu perfil, guardá tu carrito y preparate para cuando las compras online
                estén disponibles.
              </p>
              <ul className="mt-8 space-y-3 text-sm text-white/75">
                <li>· Catálogo con stock visible</li>
                <li>· Carrito persistente</li>
                <li>· Gestión de cuenta sencilla</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden">
            <BrandLogo variant="light" />
          </div>
          <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-8 shadow-[var(--shadow-md)]">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-text-secondary">{subtitle}</p>}

            <form
              className="mt-8 space-y-5"
              action={(formData) => {
                setError(null);
                setSuccess(null);
                startTransition(async () => {
                  const result = await action(formData);
                  if (result && "error" in result && result.error) setError(result.error);
                  if (result && "success" in result && result.success) setSuccess(result.success);
                });
              }}
            >
              {hiddenFields &&
                Object.entries(hiddenFields).map(([key, value]) => (
                  <input key={key} type="hidden" name={key} value={value} />
                ))}
              {children}
              {error && (
                <p className="rounded-[var(--radius-md)] bg-error-soft px-3 py-2.5 text-sm text-error" role="alert">
                  {error}
                </p>
              )}
              {success && (
                <p className="rounded-[var(--radius-md)] bg-success-soft px-3 py-2.5 text-sm text-success" role="status">
                  {success}
                </p>
              )}
              <Button type="submit" disabled={pending} fullWidth size="lg">
                {pending ? "Procesando..." : submitLabel}
              </Button>
            </form>
            {footer && <div className="mt-6 text-center text-sm text-text-secondary">{footer}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthField({
  label,
  name,
  type = "text",
  required,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";

  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-text-secondary">
        {label}
      </label>
      <div className="relative">
        <input
          id={name}
          name={name}
          type={isPassword && show ? "text" : type}
          required={required}
          autoComplete={autoComplete}
          className="h-12 w-full rounded-[var(--radius-lg)] border border-border bg-surface px-4 text-sm text-foreground outline-none transition focus:border-brand-secondary focus:ring-2 focus:ring-brand-secondary/25"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted transition hover:text-foreground"
          >
            {show ? "Ocultar" : "Mostrar"}
          </button>
        )}
      </div>
    </div>
  );
}

export function AuthLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="font-medium text-brand hover:underline">
      {children}
    </Link>
  );
}
