import Link from "next/link";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { getCartItems } from "@/app/actions/cart";
import { placeOrder } from "@/app/actions/checkout";
import { requireAuth } from "@/lib/auth/session";
import { isCheckoutEnabled } from "@/lib/checkout/flags";
import { formatPrice } from "@/lib/utils";
import { computeOrderTotals } from "@/lib/checkout/place-order";

export default async function CheckoutPage() {
  if (!isCheckoutEnabled()) {
    redirect("/carrito?error=checkout-off");
  }

  await requireAuth("/login?redirect=/checkout");
  const items = await getCartItems();

  if (!items.length) {
    redirect("/carrito?error=vacio");
  }

  const lines = items.filter((row) => row.products) as Parameters<typeof computeOrderTotals>[0];
  const { subtotal, total } = computeOrderTotals(lines);
  const idempotencyKey = randomUUID();

  return (
    <div className="tp-container py-10 sm:py-12">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">Checkout</h1>
      <p className="mt-2 text-text-secondary">
        Confirmá envío y datos. El pago online no está activo: el pedido queda registrado como
        pendiente.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <form action={placeOrder} className="space-y-4 rounded-[var(--radius-xl)] border border-border bg-surface p-6 shadow-[var(--shadow-sm)]">
          <input type="hidden" name="idempotency_key" value={idempotencyKey} />
          <h2 className="text-lg font-semibold text-foreground">Envío</h2>
          <label className="block text-sm">
            <span className="font-medium text-foreground">Calle y número</span>
            <input
              name="street"
              required
              className="mt-1 w-full rounded-[var(--radius-md)] border border-border px-3 py-2"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium text-foreground">Ciudad</span>
              <input
                name="city"
                required
                className="mt-1 w-full rounded-[var(--radius-md)] border border-border px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-foreground">Provincia</span>
              <input
                name="state"
                required
                className="mt-1 w-full rounded-[var(--radius-md)] border border-border px-3 py-2"
              />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium text-foreground">Código postal</span>
              <input
                name="postal_code"
                required
                className="mt-1 w-full rounded-[var(--radius-md)] border border-border px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-foreground">País</span>
              <input
                name="country"
                defaultValue="AR"
                className="mt-1 w-full rounded-[var(--radius-md)] border border-border px-3 py-2"
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="font-medium text-foreground">Notas (opcional)</span>
            <textarea
              name="notes"
              rows={3}
              className="mt-1 w-full rounded-[var(--radius-md)] border border-border px-3 py-2"
            />
          </label>
          <button
            type="submit"
            className="mt-4 flex h-12 w-full items-center justify-center rounded-[var(--radius-lg)] bg-brand text-sm font-semibold text-white hover:bg-brand-hover"
          >
            Confirmar pedido (sin pago online)
          </button>
          <p className="text-xs text-muted">
            No se procesará ningún cobro en esta etapa. Un operador validará el pedido.
          </p>
        </form>

        <aside className="h-fit rounded-[var(--radius-xl)] border border-border bg-surface p-6 shadow-[var(--shadow-md)]">
          <h2 className="text-lg font-semibold text-foreground">Resumen</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {lines.map((line) => (
              <li key={line.id} className="flex justify-between gap-2">
                <span className="text-text-secondary">
                  {line.products!.name} × {line.quantity}
                </span>
                <span className="font-medium text-foreground">
                  {formatPrice(Number(line.products!.price) * line.quantity)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between border-t border-border pt-3 text-base font-bold">
            <span>Total</span>
            <span className="text-brand">{formatPrice(total)}</span>
          </div>
          <p className="mt-2 text-xs text-muted">Subtotal {formatPrice(subtotal)} · envío a coordinar</p>
          <Link href="/carrito" className="mt-4 inline-block text-sm text-brand hover:underline">
            Volver al carrito
          </Link>
        </aside>
      </div>
    </div>
  );
}
