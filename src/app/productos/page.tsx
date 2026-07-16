import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { createClient } from "@/lib/supabase/server";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  const { categoria } = await searchParams;
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order")
    .order("name");

  let query = supabase
    .from("products")
    .select("*, categories(*)")
    .eq("is_active", true)
    .order("name");

  if (categoria) {
    const category = categories?.find((item) => item.slug === categoria);
    if (category) {
      query = query.eq("category_id", category.id);
    }
  }

  const { data: products } = await query;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Catálogo</h1>
        <p className="mt-2 text-text-secondary">Explorá todos nuestros productos disponibles.</p>
      </div>

      <div className="mb-8 flex flex-wrap gap-3">
        <Link
          href="/productos"
          className={`rounded-xl px-5 py-2 text-sm font-medium transition ${
            !categoria
              ? "bg-hero text-white"
              : "border border-border bg-surface text-text-secondary hover:border-brand hover:text-brand"
          }`}
        >
          Todos
        </Link>
        {categories?.map((category) => (
          <Link
            key={category.id}
            href={`/productos?categoria=${category.slug}`}
            className={`rounded-xl px-5 py-2 text-sm font-medium transition ${
              categoria === category.slug
                ? "bg-hero text-white"
                : "border border-border bg-surface text-text-secondary hover:border-brand hover:text-brand"
            }`}
          >
            {category.name}
          </Link>
        ))}
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products?.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {!products?.length && (
        <p className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center text-muted">
          No hay productos en esta categoría.
        </p>
      )}
    </div>
  );
}
