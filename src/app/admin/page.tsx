import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";

export default async function AdminDashboardPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [
    { count: productsCount },
    { count: categoriesCount },
    { count: customersCount },
    { data: lowStock },
  ] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("categories").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "customer"),
    supabase
      .from("products")
      .select("id, name, stock, low_stock_threshold")
      .eq("track_stock", true)
      .eq("is_active", true)
      .lte("stock", 5)
      .limit(5),
  ]);

  return (
    <div>
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="mt-2 text-zinc-500">Resumen general de la tienda.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Productos" value={productsCount ?? 0} href="/admin/productos" />
        <StatCard label="Categorías" value={categoriesCount ?? 0} href="/admin/categorias" />
        <StatCard label="Clientes" value={customersCount ?? 0} href="/admin/clientes" />
      </div>

      <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Stock bajo</h2>
        {!lowStock?.length ? (
          <p className="mt-4 text-sm text-zinc-500">No hay alertas de stock bajo.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {lowStock.map((item) => (
              <li key={item.id} className="flex justify-between text-sm">
                <Link href={`/admin/productos/${item.id}`} className="text-emerald-600 hover:underline">
                  {item.name}
                </Link>
                <span className="text-red-600">{item.stock} uds.</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8 rounded-2xl border border-dashed border-zinc-300 p-6 text-sm text-zinc-500">
        <p>
          <strong>Próxima etapa:</strong> checkout, pedidos y Mercado Pago. Los totales se
          calcularán en servidor y el stock se descontará al aprobar el pago vía webhook
          idempotente.
        </p>
      </section>
    </div>
  );
}

function StatCard({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-zinc-200 bg-white p-6 transition hover:shadow-md"
    >
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </Link>
  );
}
