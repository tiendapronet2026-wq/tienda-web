import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import { ProductBomSection, type ProductBomLine } from "@/components/admin/ProductBomSection";
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

  const [{ data: product }, { data: categories }, { data: bomLines }, { data: materialOptions }, rpcRes] =
    await Promise.all([
      supabase.from("products").select("*").eq("id", id).maybeSingle<Product>(),
      supabase.from("categories").select("id, name").order("name"),
      supabase
        .from("product_bom_lines")
        .select("id, quantity, materials(id, name, unit_type, current_cost, currency, is_active)")
        .eq("product_id", id)
        .eq("is_active", true)
        .is("product_variant_id", null)
        .order("created_at"),
      supabase
        .from("materials")
        .select("id, name, unit_type")
        .eq("is_active", true)
        .order("name"),
      supabase.rpc("calculate_product_material_cost", { p_product_id: id }),
    ]);

  if (!product) notFound();

  const rpcTotal =
    rpcRes.error == null && rpcRes.data != null ? Number(rpcRes.data) : null;

  const normalizedBomLines: ProductBomLine[] = (bomLines ?? []).map((row) => {
    const mat = row.materials;
    const material = (Array.isArray(mat) ? mat[0] : mat) as ProductBomLine["materials"];
    return { id: row.id, quantity: Number(row.quantity), materials: material };
  });

  const bomCurrency = normalizedBomLines[0]?.materials.currency ?? "ARS";

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
        <ProductBomSection
          productId={product.id}
          lines={normalizedBomLines}
          materials={materialOptions ?? []}
          rpcTotal={rpcTotal}
          currency={bomCurrency}
        />
      </div>
    </div>
  );
}
