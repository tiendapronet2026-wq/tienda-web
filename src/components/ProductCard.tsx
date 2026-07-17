import Link from "next/link";
import type { Product } from "@/types/database";
import { formatPrice } from "@/lib/utils";
import { ProductImage } from "@/components/ProductImage";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";

export function ProductCard({
  product,
  categoryName,
}: {
  product: Product;
  categoryName?: string | null;
}) {
  const outOfStock = product.track_stock && product.stock <= 0;
  const category = categoryName ?? product.categories?.name;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[var(--radius-xl)] border border-border bg-surface shadow-[var(--shadow-sm)] transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]">
      <Link href={`/productos/${product.slug}`} className="relative block aspect-[4/3] overflow-hidden bg-surface-muted">
        <ProductImage
          src={product.image_url}
          alt={product.name}
          className="object-cover transition duration-300 ease-out group-hover:scale-[1.03]"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
        {outOfStock && (
          <span className="absolute left-3 top-3">
            <Badge tone="soldout">Agotado</Badge>
          </span>
        )}
        {product.is_featured && !outOfStock && (
          <span className="absolute left-3 top-3">
            <Badge tone="brand">Destacado</Badge>
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-5">
        {category && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{category}</p>
        )}
        <div className="space-y-1.5">
          <Link href={`/productos/${product.slug}`}>
            <h3 className="text-base font-semibold leading-snug text-foreground transition duration-200 hover:text-brand">
              {product.name}
            </h3>
          </Link>
          {product.short_description || product.description ? (
            <p className="line-clamp-2 text-sm text-text-secondary">
              {product.short_description || product.description}
            </p>
          ) : null}
        </div>

        <div className="mt-auto space-y-3 pt-1">
          <div>
            <p className="text-2xl font-extrabold tracking-tight text-brand">
              {formatPrice(product.price)}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {outOfStock
                ? "Sin stock"
                : product.track_stock
                  ? `${product.stock} disponibles`
                  : "Disponible"}
            </p>
          </div>
          <ButtonLink href={`/productos/${product.slug}`} size="sm" variant="outline" className="w-full">
            Ver producto
          </ButtonLink>
        </div>
      </div>
    </article>
  );
}
