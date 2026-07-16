import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import { ProductForm, ProductToggle, StockAdjustForm } from "@/components/admin/ProductForm";
import { updateProduct } from "@/app/admin/actions/products";
import type { Product } from "@/types/database";

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mensaje?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { mensaje } = await searchParams;
  const supabase = await createClient();

  const [{ data: product }, { data: categories }] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).maybeSingle<Product>(),
    supabase.from("categories").select("id, name").order("name"),
  ]);

  if (!product) notFound();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/admin/productos" className="text-sm text-brand hover:underline">
            ← Volver a productos
          </Link>
          <h1 className="mt-2 text-3xl font-bold">{product.name}</h1>
        </div>
        <ProductToggle id={product.id} isActive={product.is_active} />
      </div>

      {mensaje === "creado" && (
        <p className="mt-4 rounded-lg bg-brand-soft px-4 py-3 text-sm text-brand">
          Producto creado correctamente.
        </p>
      )}

      <div className="mt-8">
        <ProductForm action={updateProduct} categories={categories ?? []} product={product} />
        {product.track_stock && <StockAdjustForm productId={product.id} />}
      </div>
    </div>
  );
}
