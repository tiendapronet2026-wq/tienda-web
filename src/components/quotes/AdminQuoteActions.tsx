"use client";

import { useState, useTransition } from "react";
import { updateQuoteNotes, updateQuoteStatus } from "@/app/admin/actions/quotes";
import { Button } from "@/components/ui/Button";
import { QUOTE_STATUSES, QUOTE_STATUS_LABELS, type QuoteStatus } from "@/lib/quotes";

export function AdminQuoteStatusForm({
  quoteId,
  currentStatus,
}: {
  quoteId: string;
  currentStatus: QuoteStatus;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = await updateQuoteStatus(formData);
          setMessage(result.error ?? "Estado actualizado.");
        });
      }}
    >
      <input type="hidden" name="id" value={quoteId} />
      <label className="block text-sm font-medium text-foreground">
        Estado
        <select
          name="status"
          defaultValue={currentStatus}
          className="mt-1.5 w-full rounded-[var(--radius-md)] border border-border bg-background px-3 py-2.5 text-sm"
        >
          {QUOTE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {QUOTE_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </label>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Guardando..." : "Actualizar estado"}
      </Button>
      {message && <p className="text-xs text-muted">{message}</p>}
    </form>
  );
}

export function AdminQuoteNotesForm({
  quoteId,
  currentNotes,
}: {
  quoteId: string;
  currentNotes: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = await updateQuoteNotes(formData);
          setMessage(result.error ?? "Notas guardadas.");
        });
      }}
    >
      <input type="hidden" name="id" value={quoteId} />
      <label className="block text-sm font-medium text-foreground">
        Notas internas
        <textarea
          name="internal_notes"
          rows={5}
          defaultValue={currentNotes ?? ""}
          className="mt-1.5 w-full rounded-[var(--radius-md)] border border-border bg-background px-3 py-2.5 text-sm"
          placeholder="Solo visible para administradores"
        />
      </label>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "Guardando..." : "Guardar notas"}
      </Button>
      {message && <p className="text-xs text-muted">{message}</p>}
    </form>
  );
}
