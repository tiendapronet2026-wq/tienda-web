import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/session";
import { OrderPaymentStatusPanel } from "@/components/checkout/OrderPaymentStatusPanel";

export default async function CheckoutPagoExitoPage({
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
      title="Pago en proceso de confirmación"
      hint="Los parámetros de la URL no acreditan el producto. Mostramos el estado real guardado en Tienda Pro tras el webhook y la verificación con Mercado Pago."
    />
  );
}
