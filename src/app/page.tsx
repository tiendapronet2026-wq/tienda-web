import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { BrandLogo } from "@/components/BrandLogo";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();

  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase.from("categories").select("*").eq("is_active", true).order("sort_order").order("name"),
  ]);

  return (
    <div>
      <section className="relative overflow-hidden bg-hero px-4 py-16 text-white sm:px-6 sm:py-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(8,96,232,0.35),_transparent_45%),radial-gradient(circle_at_bottom_left,_rgba(10,143,92,0.28),_transparent_40%)]" />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-6 hidden sm:block">
              <BrandLogo variant="dark" href={null} />
            </div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-brand-accent">
              Plataforma comercial
            </p>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Gestión y venta con identidad profesional
            </h1>
            <p className="mt-6 max-w-xl text-lg text-white/75">
              Descubrí productos seleccionados con la mejor relación calidad-precio.
              Envíos a todo el país.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/productos"
                className="inline-flex rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover"
              >
                Ver catálogo
              </Link>
              <Link
                href="/registro"
                className="inline-flex rounded-xl border border-white/25 bg-surface/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-surface/10"
              >
                Crear cuenta
              </Link>
            </div>
          </div>
          <div className="mx-auto shrink-0 lg:mx-0">
            <BrandLogo variant="mark" size="lg" href={null} />
          </div>
        </div>
      </section>

      {categories && categories.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h2 className="mb-6 text-2xl font-bold text-foreground">Categorías</h2>
          <div className="flex flex-wrap gap-3">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/productos?categoria=${category.slug}`}
                className="rounded-xl border border-border bg-surface px-5 py-2 text-sm font-medium text-text-secondary transition hover:border-brand hover:text-brand"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="text-2xl font-bold text-foreground">Destacados</h2>
          <Link href="/productos" className="text-sm font-medium text-brand hover:underline">
            Ver todos
          </Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products?.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        {!products?.length && (
          <p className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center text-muted">
            Todavía no hay productos cargados.
          </p>
        )}
      </section>
    </div>
  );
}
