import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();

  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase.from("categories").select("*").order("name"),
  ]);

  return (
    <div>
      <section className="relative overflow-hidden bg-zinc-900 px-4 py-20 text-white sm:px-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.25),_transparent_50%)]" />
        <div className="relative mx-auto max-w-6xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">
            Nueva temporada
          </p>
          <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-6xl">
            Todo lo que necesitás, en un solo lugar
          </h1>
          <p className="mt-6 max-w-xl text-lg text-zinc-300">
            Descubrí productos seleccionados con la mejor relación calidad-precio.
            Envíos a todo el país.
          </p>
          <Link
            href="/productos"
            className="mt-8 inline-flex rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400"
          >
            Ver catálogo
          </Link>
        </div>
      </section>

      {categories && categories.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h2 className="mb-6 text-2xl font-bold">Categorías</h2>
          <div className="flex flex-wrap gap-3">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/productos?categoria=${category.slug}`}
                className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-700 transition hover:border-emerald-500 hover:text-emerald-600"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="text-2xl font-bold">Destacados</h2>
          <Link href="/productos" className="text-sm font-medium text-emerald-600 hover:underline">
            Ver todos
          </Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products?.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        {!products?.length && (
          <p className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center text-zinc-500">
            Todavía no hay productos cargados.
          </p>
        )}
      </section>
    </div>
  );
}
