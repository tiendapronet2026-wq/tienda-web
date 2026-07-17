import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { EmptyState } from "@/components/ui/EmptyState";
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
  const activeCategory = categories?.find((item) => item.slug === categoria);
  const count = products?.length ?? 0;

  return (
    <div className="tp-container py-10 sm:py-12">
      <nav className="mb-4 text-sm text-muted">
        <Link href="/" className="transition hover:text-brand">
          Inicio
        </Link>
        <span className="mx-2 opacity-50">/</span>
        <span className="text-text-secondary">Productos</span>
        {activeCategory && (
          <>
            <span className="mx-2 opacity-50">/</span>
            <span className="text-text-secondary">{activeCategory.name}</span>
          </>
        )}
      </nav>

      <div className="mb-8 max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Catálogo</h1>
        <p className="mt-2 text-text-secondary">
          Explorá productos disponibles con stock visible y categorías organizadas.
        </p>
        <p className="mt-3 text-sm font-medium text-muted">
          {count} {count === 1 ? "producto" : "productos"}
          {activeCategory ? ` en ${activeCategory.name}` : ""}
        </p>
      </div>

      <div className="mb-8 rounded-[var(--radius-xl)] border border-border bg-surface p-4 shadow-[var(--shadow-sm)] sm:p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Filtrar</p>
        <div className="flex flex-wrap gap-2.5">
          <Link
            href="/productos"
            className={`rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium transition duration-200 ${
              !categoria
                ? "bg-brand text-white shadow-[var(--shadow-sm)]"
                : "border border-border bg-surface text-text-secondary hover:border-brand hover:text-brand"
            }`}
          >
            Todos
          </Link>
          {categories?.map((category) => (
            <Link
              key={category.id}
              href={`/productos?categoria=${category.slug}`}
              className={`rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium transition duration-200 ${
                categoria === category.slug
                  ? "bg-brand text-white shadow-[var(--shadow-sm)]"
                  : "border border-border bg-surface text-text-secondary hover:border-brand hover:text-brand"
              }`}
            >
              {category.name}
            </Link>
          ))}
          {categoria && (
            <Link
              href="/productos"
              className="rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium text-muted underline-offset-2 hover:text-foreground hover:underline"
            >
              Limpiar filtros
            </Link>
          )}
        </div>
      </div>

      {products && products.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No hay productos en esta vista"
          description="Probá otra categoría o volvé al catálogo completo para seguir explorando."
          actionHref="/productos"
          actionLabel="Ver todos los productos"
        />
      )}
    </div>
  );
}
