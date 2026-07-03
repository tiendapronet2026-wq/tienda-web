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
            ? "bg-emerald-50 text-emerald-700"
            : "bg-zinc-100 text-zinc-600"
        }`}
      >
        {pending ? "..." : isActive ? "Activa" : "Inactiva"}
      </button>
      {message && <p className="mt-1 text-xs text-zinc-500">{message}</p>}
    </div>
  );
}
