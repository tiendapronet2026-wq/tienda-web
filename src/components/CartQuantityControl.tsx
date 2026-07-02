"use client";

import { useTransition } from "react";
import { updateCartItemQuantity } from "@/app/actions/cart";

export function CartQuantityControl({
  itemId,
  quantity,
}: {
  itemId: string;
  quantity: number;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(() => updateCartItemQuantity(itemId, quantity - 1))
        }
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
      >
        −
      </button>
      <span className="w-8 text-center text-sm font-semibold">{quantity}</span>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(() => updateCartItemQuantity(itemId, quantity + 1))
        }
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
      >
        +
      </button>
    </div>
  );
}
