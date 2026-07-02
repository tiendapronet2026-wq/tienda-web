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
      className="w-full rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-300"
    >
      {pending ? "Agregando..." : disabled ? "Sin stock" : "Agregar al carrito"}
    </button>
  );
}
