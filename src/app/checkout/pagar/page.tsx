import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/session";
import { isCheckoutEnabled } from "@/lib/checkout/flags";
import { ensureMercadoPagoCheckoutForOrder } from "@/lib/integrations/mercadopago/mp-checkout";

export default async function CheckoutPagarPage({
  searchParams,
}: {
  searchParams: Promise<{ pedido?: string }>;
}) {
  if (!isCheckoutEnabled()) redirect("/carrito");

  const user = await requireAuth("/login?redirect=/carrito");
  const { pedido: orderId } = await searchParams;
  if (!orderId) redirect("/carrito");

  try {
    const { checkoutUrl } = await ensureMercadoPagoCheckoutForOrder({
      orderId,
      userEmail: user.email ?? "comprador@tiendapro.net",
    });
    redirect(checkoutUrl);
  } catch {
    redirect(`/checkout/pago/error?pedido=${encodeURIComponent(orderId)}`);
  }
}
