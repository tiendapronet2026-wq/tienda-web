import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import { formatPrice } from "@/lib/utils";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categoria?: string; estado?: string }>;
}) {
  await requireAdmin();
  const { q, categoria, estado } = await searchParams;
  const supabase = await createClient();

  const { data: categories } = await supabase.from("categories").select("id, name, slug").order("name");

  let query = supabase.from("products").select("*, categories(name)").order("name");

  if (q) query = query.ilike("name", `%${q}%`);
  if (categoria) {
    const cat = categories?.find((c) => c.slug === categoria);
    if (cat) query = query.eq("category_id", cat.id);
  }
  if (estado === "activo") query = query.eq("is_active", true);
  if (estado === "inactivo") query = query.eq("is_active", false);
  if (estado === "destacado") query = query.eq("is_featured", true);
  if (estado === "stock-bajo") query = query.eq("track_stock", true).lte("stock", 5);

  const { data: products } = await query;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Productos</h1>
        <Link
          href="/admin/productos/nuevo"
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Nuevo producto
        </Link>
      </div>

      <form className="mt-6 flex flex-wrap gap-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar..."
          className="rounded-xl border border-zinc-200 px-4 py-2 text-sm"
        />
        <select name="categoria" defaultValue={categoria} className="rounded-xl border border-zinc-200 px-4 py-2 text-sm">
          <option value="">Todas las categorías</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <select name="estado" defaultValue={estado} className="rounded-xl border border-zinc-200 px-4 py-2 text-sm">
          <option value="">Todos</option>
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos</option>
          <option value="destacado">Destacados</option>
          <option value="stock-bajo">Stock bajo</option>
        </select>
        <button type="submit" className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white">
          Filtrar
        </button>
      </form>

      <div className="mt-8 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-100 bg-zinc-50">
            <tr>
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Precio</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {products?.map((product) => (
              <tr key={product.id} className="border-b border-zinc-50">
                <td className="px-4 py-3">
                  <Link href={`/admin/productos/${product.id}`} className="flex items-center gap-3">
                    <div className="relative h-10 w-10 overflow-hidden rounded-lg bg-zinc-100">
                      {product.image_url && (
                        <Image src={product.image_url} alt="" fill className="object-cover" sizes="40px" />
                      )}
                    </div>
                    <span className="font-medium hover:text-emerald-600">{product.name}</span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-zinc-500">{product.sku ?? "—"}</td>
                <td className="px-4 py-3">{formatPrice(product.price)}</td>
                <td className="px-4 py-3">
                  {product.track_stock ? (
                    <span className={product.stock <= product.low_stock_threshold ? "text-red-600" : ""}>
                      {product.stock}
                    </span>
                  ) : (
                    "∞"
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      product.is_active ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {product.is_active ? "Activo" : "Inactivo"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!products?.length && (
          <p className="p-8 text-center text-zinc-500">No hay productos que coincidan.</p>
        )}
      </div>
    </div>
  );
}
