import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/session";
import { OrderPaymentStatusPanel } from "@/components/checkout/OrderPaymentStatusPanel";

export default async function CheckoutPagoPendientePage({
  searchParams,
}: {
  searchParams: Promise<{ pedido?: string }>;
}) {
  await requireAuth();
  const { pedido: orderId } = await searchParams;
  if (!orderId) redirect("/carrito");

  return (
    <OrderPaymentStatusPanel
      orderId={orderId}
      title="Pago pendiente"
      hint="Mercado Pago aún no acreditó el pago. No se otorga acceso digital hasta processed/accredited confirmado en servidor."
    />
  );
}
