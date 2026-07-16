"use client";

import { useState, useTransition } from "react";
import { toggleCategory } from "@/app/admin/actions/categories";

export function CategoryToggle({
  id,
  isActive,
}: {
  id: string;
  isActive: boolean;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await toggleCategory(id, !isActive);
            setMessage(result.error ?? result.success ?? null);
          })
        }
        className={`rounded-lg px-3 py-1 text-xs font-semibold ${
          isActive
            ? "bg-brand-soft text-brand"
            : "bg-surface-muted text-text-secondary"
        }`}
      >
        {pending ? "..." : isActive ? "Activa" : "Inactiva"}
      </button>
      {message && <p className="mt-1 text-xs text-muted">{message}</p>}
    </div>
  );
}
