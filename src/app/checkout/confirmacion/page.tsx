import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/session";
import { isCheckoutEnabled } from "@/lib/checkout/flags";
import { formatPrice } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/Button";

export default async function CheckoutConfirmacionPage({
  searchParams,
}: {
  searchParams: Promise<{ pedido?: string }>;
}) {
  if (!isCheckoutEnabled()) {
    redirect("/carrito");
  }

  const user = await requireAuth();
  const { pedido: orderId } = await searchParams;

  if (!orderId) {
    redirect("/carrito");
  }

  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!order) {
    redirect("/acceso-denegado");
  }

  return (
    <div className="tp-container py-10 sm:py-12">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">Pedido confirmado</h1>
      <p className="mt-2 text-text-secondary">
        Registramos tu pedido <span className="font-mono text-sm">{order.id.slice(0, 8)}</span>.
        Estado: <strong>{order.status}</strong>. Te contactaremos para coordinar pago y envío.
      </p>
      <p className="mt-4 text-lg font-bold text-brand">Total: {formatPrice(Number(order.total))}</p>
      <ul className="mt-6 space-y-2 text-sm">
        {(order.order_items as Array<{ product_name: string; quantity: number; line_total: number }>).map(
          (item, idx) => (
            <li key={idx} className="flex justify-between border-b border-border py-2">
              <span>
                {item.product_name} × {item.quantity}
              </span>
              <span>{formatPrice(Number(item.line_total))}</span>
            </li>
          )
        )}
      </ul>
      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink href="/productos">Seguir comprando</ButtonLink>
        <Link href="/mi-cuenta" className="text-sm font-medium text-brand hover:underline">
          Mi cuenta
        </Link>
      </div>
    </div>
  );
}
