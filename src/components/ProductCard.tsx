import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/types/database";
import { formatPrice } from "@/lib/utils";

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <Link href={`/productos/${product.slug}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-zinc-100">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover transition duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-zinc-400">
              Sin imagen
            </div>
          )}
        </div>
        <div className="space-y-2 p-5">
          <h3 className="text-lg font-semibold text-zinc-900">{product.name}</h3>
          <p className="line-clamp-2 text-sm text-zinc-500">{product.description}</p>
          <div className="flex items-center justify-between pt-2">
            <span className="text-lg font-bold text-emerald-600">
              {formatPrice(product.price)}
            </span>
            <span className="text-xs text-zinc-400">
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
