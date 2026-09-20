"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  approveOperationalTask,
  createOperationalTask,
  dispatchOperationalTask,
  simulateOperationalTaskCompletion,
} from "@/app/actions/operational-bridge";
import { Button } from "@/components/ui/Button";

export function OperationalTaskCreateForm() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <form
      className="mt-6 rounded-xl border border-border bg-surface p-5"
      action={(fd) => {
        startTransition(async () => {
          const res = await createOperationalTask(fd);
          setMessage(res.ok ? `Tarea creada: ${res.taskId}` : res.error ?? "Error");
        });
      }}
    >
      <h2 className="text-lg font-semibold text-foreground">Nueva tarea (piloto TiendaPro)</h2>
      <input type="hidden" name="project_slug" value="tiendapro" />
      <div className="mt-4 grid gap-3">
        <input
          name="title"
          required
          placeholder="Título corto"
          className="rounded-lg border border-border px-3 py-2 text-sm"
        />
        <textarea
          name="instruction"
          required
          rows={4}
          placeholder="Instrucción para Cursor / operador"
          className="rounded-lg border border-border px-3 py-2 text-sm"
        />
        <select name="risk_class" className="rounded-lg border border-border px-3 py-2 text-sm">
          <option value="minor">Corrección menor (modo C — auto si circuito validado)</option>
          <option value="critical">Crítica — requiere aprobación owner</option>
        </select>
      </div>
      <Button type="submit" className="mt-4" disabled={pending}>
        Crear tarea
      </Button>
      {message ? <p className="mt-2 text-sm text-text-secondary">{message}</p> : null}
    </form>
  );
}

export function OperationalTaskActions({
  taskId,
  status,
  isOwner,
}: {
  taskId: string;
  status: string;
  isOwner: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  if (!isOwner) {
    return (
      <p className="text-sm text-text-secondary">Solo el propietario puede aprobar, despachar o cerrar.</p>
    );
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {status === "pending_approval" ? (
        <Button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await approveOperationalTask(taskId);
              setMsg(r.ok ? "Aprobada" : r.error ?? "Error");
            })
          }
        >
          Aprobar (owner)
        </Button>
      ) : null}
      {status === "approved" ? (
        <Button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await dispatchOperationalTask(taskId);
              setMsg(r.ok ? `Despachada${r.simulated ? " (simulado)" : ""}` : r.error ?? "Error");
            })
          }
        >
          Despachar → GitHub
        </Button>
      ) : null}
      {status === "dispatched" || status === "running" ? (
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await simulateOperationalTaskCompletion(taskId);
              setMsg(r.ok ? "Resultado simulado registrado" : r.error ?? "Error");
            })
          }
        >
          Registrar resultado simulado (Cursor v1)
        </Button>
      ) : null}
      <ButtonLink href="/control/tareas" variant="outline">
        Volver
      </ButtonLink>
      {msg ? <p className="w-full text-sm text-text-secondary">{msg}</p> : null}
    </div>
  );
}

function ButtonLink({
  href,
  children,
  variant,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "outline";
}) {
  return (
    <Link
      href={href}
      className={
        variant === "outline"
          ? "inline-flex h-11 items-center rounded-[var(--radius-lg)] border border-border px-5 text-sm font-semibold"
          : "inline-flex h-11 items-center rounded-[var(--radius-lg)] bg-brand px-5 text-sm font-semibold text-white"
      }
    >
      {children}
    </Link>
  );
}
