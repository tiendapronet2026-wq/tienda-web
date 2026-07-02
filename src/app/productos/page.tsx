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
    .order("name");

  let query = supabase
    .from("products")
    .select("*, categories(*)")
    .eq("active", true)
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
        <h1 className="text-3xl font-bold">Catálogo</h1>
        <p className="mt-2 text-zinc-500">
          Explorá todos nuestros productos disponibles.
        </p>
      </div>

      <div className="mb-8 flex flex-wrap gap-3">
        <Link
          href="/productos"
          className={`rounded-full px-5 py-2 text-sm font-medium transition ${
            !categoria
              ? "bg-zinc-900 text-white"
              : "border border-zinc-200 bg-white text-zinc-700 hover:border-emerald-500"
          }`}
        >
          Todos
        </Link>
        {categories?.map((category) => (
          <Link
            key={category.id}
            href={`/productos?categoria=${category.slug}`}
            className={`rounded-full px-5 py-2 text-sm font-medium transition ${
              categoria === category.slug
                ? "bg-zinc-900 text-white"
                : "border border-zinc-200 bg-white text-zinc-700 hover:border-emerald-500"
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
        <p className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center text-zinc-500">
          No hay productos en esta categoría.
        </p>
      )}
    </div>
  );
}
