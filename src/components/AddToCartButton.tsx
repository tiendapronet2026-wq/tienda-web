"use client";

import { useTransition } from "react";
import { addToCart } from "@/app/actions/cart";
import { Button } from "@/components/ui/Button";

export function AddToCartButton({
  productId,
  disabled,
}: {
  productId: string;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      disabled={disabled || pending}
      fullWidth
      size="lg"
      onClick={() => startTransition(() => addToCart(productId))}
    >
      {pending ? "Agregando..." : disabled ? "Producto agotado" : "Agregar al carrito"}
    </Button>
  );
}
