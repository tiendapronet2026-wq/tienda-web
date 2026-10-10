import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/session";
import { OrderPaymentStatusPanel } from "@/components/checkout/OrderPaymentStatusPanel";

export default async function CheckoutPagoErrorPage({
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
      title="No se completó el pago"
      hint="Podés reintentar desde acá. El acceso digital solo se habilita cuando el backend confirma la order acreditada."
    />
  );
}
