"use client";

import { useTransition } from "react";
import { addToCart } from "@/app/actions/cart";

export function AddToCartButton({
  productId,
  disabled,
}: {
  productId: string;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={disabled || pending}
      onClick={() => startTransition(() => addToCart(productId))}
      className="w-full rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted"
    >
      {pending ? "Agregando..." : disabled ? "Sin stock" : "Agregar al carrito"}
    </button>
  );
}
