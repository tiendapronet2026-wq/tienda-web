import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/AddToCartButton";
import { ProductCard } from "@/components/ProductCard";
import { ProductImage } from "@/components/ProductImage";
import { Badge } from "@/components/ui/Badge";
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

  const outOfStock = product.track_stock && product.stock <= 0;

  let related: typeof product[] = [];
  if (product.category_id) {
    const { data } = await supabase
      .from("products")
      .select("*, categories(*)")
      .eq("is_active", true)
      .eq("category_id", product.category_id)
      .neq("id", product.id)
      .limit(4);
    related = data ?? [];
  }

  return (
    <div className="tp-container py-10 sm:py-12">
      <nav className="mb-6 text-sm text-muted">
        <Link href="/" className="transition hover:text-brand">
          Inicio
        </Link>
        <span className="mx-2 opacity-50">/</span>
        <Link href="/productos" className="transition hover:text-brand">
          Productos
        </Link>
        {product.categories && (
          <>
            <span className="mx-2 opacity-50">/</span>
            <Link
              href={`/productos?categoria=${product.categories.slug}`}
              className="transition hover:text-brand"
            >
              {product.categories.name}
            </Link>
          </>
        )}
        <span className="mx-2 opacity-50">/</span>
        <span className="text-text-secondary">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
        <div className="relative aspect-square overflow-hidden rounded-[1.5rem] border border-border bg-surface-muted shadow-[var(--shadow-sm)]">
          <ProductImage
            src={product.image_url}
            alt={product.name}
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority
          />
        </div>

        <div className="flex flex-col">
          {product.categories && (
            <Badge tone="brand" className="w-fit">
              {product.categories.name}
            </Badge>
          )}
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {product.name}
          </h1>
          <p className="mt-4 text-3xl font-bold tracking-tight text-brand">
            {formatPrice(product.price)}
          </p>

          <div className="mt-4">
            {outOfStock ? (
              <Badge tone="soldout">Producto agotado</Badge>
            ) : (
              <Badge tone="available">
                {product.track_stock
                  ? `Stock disponible · ${product.stock} unidades`
                  : "Stock disponible"}
              </Badge>
            )}
          </div>

          {product.description && (
            <p className="mt-6 text-base leading-relaxed text-text-secondary">{product.description}</p>
          )}

          <div className="mt-8 space-y-3 rounded-[var(--radius-xl)] border border-border bg-surface p-5 shadow-[var(--shadow-sm)]">
            <AddToCartButton productId={product.id} disabled={outOfStock} />
            <p className="text-xs text-muted">
              Podés seguir explorando productos mientras el checkout permanece en etapa beta.
            </p>
          </div>

          <ul className="mt-8 space-y-2 text-sm text-text-secondary">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
              Disponibilidad sincronizada con el inventario actual
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-secondary" aria-hidden />
              Carrito persistente para retomar tu selección
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-accent" aria-hidden />
              Compra online disponible próximamente
            </li>
          </ul>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16 border-t border-border pt-12">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Productos relacionados</h2>
          <p className="mt-2 text-sm text-text-secondary">Más opciones de la misma categoría.</p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
