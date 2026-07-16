import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import { CategoryToggle } from "@/components/admin/CategoryToggle";
import { createCategory } from "@/app/admin/actions/categories";

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ mensaje?: string }>;
}) {
  await requireAdmin();
  const { mensaje } = await searchParams;
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("categories")
    .select("*, products(count)")
    .order("sort_order")
    .order("name");

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Categorías</h1>
      </div>

      {mensaje === "creado" && (
        <p className="mt-4 rounded-lg bg-brand-soft px-4 py-3 text-sm text-brand">
          Categoría creada correctamente.
        </p>
      )}

      <form action={createCategory} className="mt-8 rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold">Nueva categoría</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <input
            name="name"
            required
            placeholder="Nombre"
            className="rounded-xl border border-border px-4 py-3 text-sm"
          />
          <input
            name="description"
            placeholder="Descripción"
            className="rounded-xl border border-border px-4 py-3 text-sm"
          />
          <input
            name="sort_order"
            type="number"
            defaultValue={0}
            placeholder="Orden"
            className="rounded-xl border border-border px-4 py-3 text-sm"
          />
        </div>
        <button
          type="submit"
          className="mt-4 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white"
        >
          Crear categoría
        </button>
      </form>

      <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface-muted">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Productos</th>
              <th className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {categories?.map((category) => (
              <tr key={category.id} className="border-b border-border">
                <td className="px-4 py-3 font-medium">{category.name}</td>
                <td className="px-4 py-3 text-muted">{category.slug}</td>
                <td className="px-4 py-3">
                  {(category.products as { count: number }[])?.[0]?.count ?? 0}
                </td>
                <td className="px-4 py-3">
                  <CategoryToggle id={category.id} isActive={category.is_active} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!categories?.length && (
          <p className="p-8 text-center text-muted">No hay categorías.</p>
        )}
      </div>
    </div>
  );
}
