"use client";

import { useState, useTransition } from "react";
import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";

export function AccountForms({
  profileForm,
  passwordForm,
}: {
  profileForm: React.ReactNode;
  passwordForm: React.ReactNode;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-8">
      {profileForm}
      {passwordForm}
      <div className="border-t border-border pt-6">
        <h2 className="text-lg font-semibold text-foreground">Sesión</h2>
        <p className="mt-1 text-sm text-muted">Cerrá tu sesión en este dispositivo.</p>
        <form action={() => startTransition(() => signOut())} className="mt-4">
          <Button type="submit" variant="destructive" disabled={pending} size="sm">
            {pending ? "Cerrando..." : "Cerrar sesión"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export function ProfileForm({
  action,
  defaultValues,
}: {
  action: (formData: FormData) => Promise<{ error?: string; success?: string }>;
  defaultValues: {
    first_name: string;
    last_name: string;
    phone: string;
    document_number: string;
    email: string;
  };
}) {
  const [message, setMessage] = useState<{ error?: string; success?: string } | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          const result = await action(formData);
          setMessage(result);
        });
      }}
    >
      <h2 className="text-lg font-semibold text-foreground">Datos personales</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" name="first_name" defaultValue={defaultValues.first_name} />
        <Field label="Apellido" name="last_name" defaultValue={defaultValues.last_name} />
        <Field label="Teléfono" name="phone" defaultValue={defaultValues.phone} />
        <Field
          label="Documento"
          name="document_number"
          defaultValue={defaultValues.document_number}
        />
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-text-secondary">Email</label>
          <input
            value={defaultValues.email}
            disabled
            className="h-12 w-full rounded-[var(--radius-lg)] border border-border bg-surface-muted px-4 text-sm text-muted"
          />
        </div>
      </div>
      {message?.error && <p className="mt-3 text-sm text-error">{message.error}</p>}
      {message?.success && <p className="mt-3 text-sm text-brand">{message.success}</p>}
      <Button type="submit" disabled={pending} className="mt-5">
        {pending ? "Guardando..." : "Guardar cambios"}
      </Button>
    </form>
  );
}

export function PasswordForm({
  action,
}: {
  action: (formData: FormData) => Promise<{ error?: string; success?: string }>;
}) {
  const [show, setShow] = useState(false);
  const [message, setMessage] = useState<{ error?: string; success?: string } | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          const result = await action(formData);
          setMessage(result);
        });
      }}
      className="border-t border-border pt-6"
    >
      <h2 className="text-lg font-semibold text-foreground">Cambiar contraseña</h2>
      <div className="mt-4">
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-text-secondary">
          Nueva contraseña
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            minLength={8}
            required
            autoComplete="new-password"
            className="h-12 w-full rounded-[var(--radius-lg)] border border-border px-4 text-sm outline-none transition focus:border-brand-secondary focus:ring-2 focus:ring-brand-secondary/25"
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted hover:text-foreground"
          >
            {show ? "Ocultar" : "Mostrar"}
          </button>
        </div>
      </div>
      {message?.error && <p className="mt-3 text-sm text-error">{message.error}</p>}
      {message?.success && <p className="mt-3 text-sm text-brand">{message.success}</p>}
      <Button type="submit" disabled={pending} className="mt-5" variant="secondary">
        {pending ? "Actualizando..." : "Actualizar contraseña"}
      </Button>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-text-secondary">
        {label}
      </label>
      <input
        id={name}
        name={name}
        defaultValue={defaultValue}
        className="h-12 w-full rounded-[var(--radius-lg)] border border-border px-4 text-sm outline-none transition focus:border-brand-secondary focus:ring-2 focus:ring-brand-secondary/25"
      />
    </div>
  );
}
