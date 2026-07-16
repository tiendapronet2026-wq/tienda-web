import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/AddToCartButton";
import { ProductImage } from "@/components/ProductImage";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select("*, categories(*)")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!product) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link href="/productos" className="text-sm font-medium text-brand hover:underline">
        ← Volver al catálogo
      </Link>

      <div className="mt-8 grid gap-10 lg:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-3xl bg-surface-muted">
          <ProductImage
            src={product.image_url}
            alt={product.name}
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority
          />
        </div>

        <div className="space-y-6">
          {product.categories && (
            <span className="inline-flex rounded-lg bg-brand-soft px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand">
              {product.categories.name}
            </span>
          )}
          <h1 className="text-4xl font-bold tracking-tight text-foreground">{product.name}</h1>
          <p className="text-3xl font-bold text-brand">{formatPrice(product.price)}</p>
          <p className="text-lg leading-relaxed text-text-secondary">{product.description}</p>
          <p className="text-sm text-muted">
            {product.track_stock
              ? product.stock > 0
                ? `${product.stock} unidades disponibles`
                : "Producto sin stock"
              : "Disponible"}
          </p>
          <AddToCartButton
            productId={product.id}
            disabled={product.track_stock && product.stock <= 0}
          />
        </div>
      </div>
    </div>
  );
}
