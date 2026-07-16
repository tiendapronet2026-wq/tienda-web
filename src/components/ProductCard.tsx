import Link from "next/link";
import type { Product } from "@/types/database";
import { formatPrice } from "@/lib/utils";
import { ProductImage } from "@/components/ProductImage";

export function ProductCard({ product }: { product: Product }) {
  const outOfStock = product.track_stock && product.stock <= 0;

  return (
    <article className="group overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <Link href={`/productos/${product.slug}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-surface-muted">
          <ProductImage
            src={product.image_url}
            alt={product.name}
            className="object-cover transition duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
          {outOfStock && (
            <span className="absolute left-3 top-3 rounded-lg bg-error px-2.5 py-1 text-xs font-semibold text-white">
              Sin stock
            </span>
          )}
        </div>
        <div className="space-y-2 p-5">
          <h3 className="text-lg font-semibold text-foreground">{product.name}</h3>
          <p className="line-clamp-2 text-sm text-text-secondary">{product.description}</p>
          <div className="flex items-center justify-between pt-2">
            <span className="text-lg font-bold text-brand">{formatPrice(product.price)}</span>
            <span className="text-xs text-muted">
              {!product.track_stock || product.stock > 0
                ? product.track_stock
                  ? `${product.stock} en stock`
                  : "Disponible"
                : "Sin stock"}
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
