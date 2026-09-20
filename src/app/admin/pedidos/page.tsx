import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import { formatPrice } from "@/lib/utils";

export default async function AdminPedidosPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: orders } = await supabase
    .from("orders")
    .select("id, status, total, currency, created_at, user_id")
    .order("created_at", { ascending: false })
    .limit(100);

  const userIds = [...new Set((orders ?? []).map((o) => o.user_id))];
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, first_name, last_name").in("id", userIds)
    : { data: [] };
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-foreground">Pedidos</h1>
      <p className="mt-2 text-text-secondary">Pedidos web registrados (sin cobro online automático).</p>

      {!orders?.length ? (
        <p className="mt-8 text-sm text-muted">No hay pedidos todavía.</p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-[var(--radius-xl)] border border-border bg-surface shadow-[var(--shadow-sm)]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-muted/50 text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const profile = profileById.get(order.user_id);
                const name = profile
                  ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()
                  : "—";
                return (
                  <tr key={order.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-text-secondary">
                      {new Date(order.created_at).toLocaleString("es-AR")}
                    </td>
                    <td className="px-4 py-3">{name || "—"}</td>
                    <td className="px-4 py-3 font-medium">{order.status}</td>
                    <td className="px-4 py-3 font-semibold">{formatPrice(Number(order.total))}</td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/pedidos/${order.id}`} className="text-brand hover:underline">
                        Ver
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
