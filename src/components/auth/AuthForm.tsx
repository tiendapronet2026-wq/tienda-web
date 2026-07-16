"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

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
    <div className="mx-auto w-full max-w-md px-4 py-12">
      <div className="mb-8 flex justify-center">
        <BrandLogo variant="light" />
      </div>
      <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-text-secondary">{subtitle}</p>}

        <form
          className="mt-8 space-y-4"
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
            <p className="rounded-lg bg-error-soft px-3 py-2 text-sm text-error">{error}</p>
          )}
          {success && (
            <p className="rounded-lg bg-success-soft px-3 py-2 text-sm text-success">{success}</p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Procesando..." : submitLabel}
          </button>
        </form>
        {footer && <div className="mt-6 text-center text-sm text-text-secondary">{footer}</div>}
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
      <label htmlFor={name} className="mb-1 block text-sm font-medium text-text-secondary">
        {label}
      </label>
      <div className="relative">
        <input
          id={name}
          name={name}
          type={isPassword && show ? "text" : type}
          required={required}
          autoComplete={autoComplete}
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none ring-brand-secondary focus:ring-2"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted"
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
