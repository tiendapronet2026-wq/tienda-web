"use client";

import { useState, useTransition } from "react";
import { signOut } from "@/app/actions/auth";

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
      <form
        action={() => startTransition(() => signOut())}
        className="rounded-2xl border border-border bg-surface p-6"
      >
        <h2 className="text-lg font-semibold">Sesión</h2>
        <p className="mt-1 text-sm text-muted">Cerrá tu sesión en este dispositivo.</p>
        <button
          type="submit"
          disabled={pending}
          className="mt-4 rounded-xl border border-error/30 px-4 py-2 text-sm font-semibold text-error hover:bg-error-soft disabled:opacity-60"
        >
          {pending ? "Cerrando..." : "Cerrar sesión"}
        </button>
      </form>
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
      className="rounded-2xl border border-border bg-surface p-6"
    >
      <h2 className="text-lg font-semibold">Datos personales</h2>
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
          <label className="mb-1 block text-sm font-medium text-text-secondary">Email</label>
          <input
            value={defaultValues.email}
            disabled
            className="w-full rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm text-muted"
          />
        </div>
      </div>
      {message?.error && <p className="mt-3 text-sm text-error">{message.error}</p>}
      {message?.success && <p className="mt-3 text-sm text-brand">{message.success}</p>}
      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Guardando..." : "Guardar cambios"}
      </button>
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
      className="rounded-2xl border border-border bg-surface p-6"
    >
      <h2 className="text-lg font-semibold">Cambiar contraseña</h2>
      <div className="relative mt-4">
        <input
          name="password"
          type={show ? "text" : "password"}
          minLength={8}
          required
          placeholder="Nueva contraseña"
          className="w-full rounded-xl border border-border px-4 py-3 text-sm"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted"
        >
          {show ? "Ocultar" : "Mostrar"}
        </button>
      </div>
      {message?.error && <p className="mt-3 text-sm text-error">{message.error}</p>}
      {message?.success && <p className="mt-3 text-sm text-brand">{message.success}</p>}
      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-xl bg-hero px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Actualizando..." : "Actualizar contraseña"}
      </button>
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
      <label htmlFor={name} className="mb-1 block text-sm font-medium text-text-secondary">
        {label}
      </label>
      <input
        id={name}
        name={name}
        defaultValue={defaultValue}
        className="w-full rounded-xl border border-border px-4 py-3 text-sm"
      />
    </div>
  );
}
