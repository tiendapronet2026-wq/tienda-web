import Link from "next/link";
import { getCartItems } from "@/app/actions/cart";
import { CartQuantityControl } from "@/components/CartQuantityControl";
import { ProductImage } from "@/components/ProductImage";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatPrice } from "@/lib/utils";

export default async function CartPage() {
  const items = await getCartItems();
  const total = items.reduce(
    (sum, item) => sum + (item.products?.price ?? 0) * item.quantity,
    0
  );
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="tp-container py-10 sm:py-12">
      <div className="mb-8 max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Tu carrito</h1>
        <p className="mt-2 text-text-secondary">
          Revisá tu selección y ajustá cantidades antes de continuar.
        </p>
      </div>

      {!items.length ? (
        <EmptyState
          title="Tu carrito está vacío"
          description="Explorá el catálogo y agregá productos para armar tu pedido cuando las compras online estén disponibles."
          actionHref="/productos"
          actionLabel="Seguir explorando productos"
        />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-4 rounded-[var(--radius-xl)] border border-border bg-surface p-4 shadow-[var(--shadow-sm)] sm:flex-row sm:items-center"
              >
                <Link
                  href={`/productos/${item.products?.slug ?? ""}`}
                  className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[var(--radius-lg)] bg-surface-muted"
                >
                  <ProductImage
                    src={item.products?.image_url}
                    alt={item.products?.name ?? "Producto"}
                    className="object-cover"
                    sizes="96px"
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/productos/${item.products?.slug ?? ""}`}
                    className="font-semibold text-foreground transition hover:text-brand"
                  >
                    {item.products?.name}
                  </Link>
                  <p className="mt-1 text-sm text-text-secondary">
                    {formatPrice(item.products?.price ?? 0)} c/u
                  </p>
                </div>
                <CartQuantityControl itemId={item.id} quantity={item.quantity} />
                <p className="min-w-28 text-right text-base font-bold text-foreground">
                  {formatPrice((item.products?.price ?? 0) * item.quantity)}
                </p>
              </div>
            ))}
          </div>

          <aside className="h-fit rounded-[var(--radius-xl)] border border-border bg-surface p-6 shadow-[var(--shadow-md)] lg:sticky lg:top-24">
            <h2 className="text-lg font-semibold text-foreground">Resumen</h2>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between text-text-secondary">
                <dt>Artículos</dt>
                <dd className="font-medium text-foreground">{itemCount}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-3 text-base">
                <dt className="font-semibold text-foreground">Total</dt>
                <dd className="text-xl font-bold text-brand">{formatPrice(total)}</dd>
              </div>
            </dl>

            <button
              type="button"
              disabled
              aria-disabled="true"
              title="Las compras online estarán disponibles próximamente"
              className="mt-6 flex h-12 w-full cursor-not-allowed items-center justify-center rounded-[var(--radius-lg)] bg-surface-muted text-sm font-semibold text-muted"
            >
              Finalizar compra (próximamente)
            </button>
            <p className="mt-3 text-center text-xs leading-relaxed text-muted">
              Las compras online estarán disponibles próximamente.
            </p>
            <div className="mt-5">
              <ButtonLink href="/productos" variant="outline" fullWidth>
                Seguir explorando productos
              </ButtonLink>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
