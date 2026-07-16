import Link from "next/link";
import { getCartItems } from "@/app/actions/cart";
import { CartQuantityControl } from "@/components/CartQuantityControl";
import { ProductImage } from "@/components/ProductImage";
import { formatPrice } from "@/lib/utils";

export default async function CartPage() {
  const items = await getCartItems();
  const total = items.reduce(
    (sum, item) => sum + (item.products?.price ?? 0) * item.quantity,
    0
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold text-foreground">Tu carrito</h1>

      {!items.length ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border bg-surface p-12 text-center">
          <p className="text-muted">Tu carrito está vacío.</p>
          <Link
            href="/productos"
            className="mt-4 inline-flex rounded-xl bg-hero px-5 py-2 text-sm font-semibold text-white transition hover:bg-foreground"
          >
            Ir a comprar
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-center"
            >
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-surface-muted">
                <ProductImage
                  src={item.products?.image_url}
                  alt={item.products?.name ?? "Producto"}
                  className="object-cover"
                  sizes="96px"
                />
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-foreground">{item.products?.name}</h2>
                <p className="text-sm text-text-secondary">
                  {formatPrice(item.products?.price ?? 0)} c/u
                </p>
              </div>
              <CartQuantityControl itemId={item.id} quantity={item.quantity} />
              <p className="min-w-28 text-right font-semibold text-foreground">
                {formatPrice((item.products?.price ?? 0) * item.quantity)}
              </p>
            </div>
          ))}

          <div className="flex items-center justify-between rounded-2xl bg-hero px-6 py-5 text-white">
            <span className="text-lg font-medium">Total</span>
            <span className="text-2xl font-bold">{formatPrice(total)}</span>
          </div>

          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Las compras online estarán disponibles próximamente"
            className="w-full cursor-not-allowed rounded-xl bg-surface-muted px-6 py-4 text-sm font-semibold text-muted"
          >
            Finalizar compra (próximamente)
          </button>
          <p className="text-center text-xs text-muted">
            Checkout deshabilitado mientras el sitio está en etapa beta.
          </p>
        </div>
      )}
    </div>
  );
}
