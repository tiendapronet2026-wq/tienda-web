import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import { ProductForm } from "@/components/admin/ProductForm";
import { createProduct } from "@/app/admin/actions/products";

export default async function NewProductPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  return (
    <div>
      <h1 className="text-3xl font-bold">Nuevo producto</h1>
      <div className="mt-8">
        <ProductForm action={createProduct} categories={categories ?? []} />
      </div>
    </div>
  );
}
