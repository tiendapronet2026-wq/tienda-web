import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import { formatPrice } from "@/lib/utils";

export default async function AdminPedidoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", id)
    .maybeSingle();

  if (!order) {
    notFound();
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, phone")
    .eq("id", order.user_id)
    .maybeSingle();

  const address = order.shipping_address as Record<string, string> | null;

  return (
    <div>
      <Link href="/admin/pedidos" className="text-sm text-brand hover:underline">
        ← Pedidos
      </Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">Pedido</h1>
      <p className="mt-2 font-mono text-sm text-muted">{order.id}</p>

      <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted">Estado</dt>
          <dd className="font-semibold">{order.status}</dd>
        </div>
        <div>
          <dt className="text-muted">Total</dt>
          <dd className="font-bold text-brand">{formatPrice(Number(order.total))}</dd>
        </div>
        <div>
          <dt className="text-muted">Cliente</dt>
          <dd>
            {profile ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Creado</dt>
          <dd>{new Date(order.created_at).toLocaleString("es-AR")}</dd>
        </div>
      </dl>

      {address && (
        <section className="mt-8 rounded-[var(--radius-xl)] border border-border bg-surface p-6">
          <h2 className="font-semibold text-foreground">Envío</h2>
          <p className="mt-2 text-sm text-text-secondary">
            {address.street}, {address.city}, {address.state} ({address.postal_code}) —{" "}
            {address.country}
          </p>
        </section>
      )}

      <section className="mt-8 rounded-[var(--radius-xl)] border border-border bg-surface p-6">
        <h2 className="font-semibold text-foreground">Ítems</h2>
        <ul className="mt-4 space-y-2 text-sm">
          {(order.order_items as Array<{
            product_name: string;
            quantity: number;
            unit_price: number;
            line_total: number;
          }>).map((item, idx) => (
            <li key={idx} className="flex justify-between border-b border-border py-2">
              <span>
                {item.product_name} × {item.quantity}
              </span>
              <span>{formatPrice(Number(item.line_total))}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
