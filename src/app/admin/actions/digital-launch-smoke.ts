"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleApprovedOrder } from "@/lib/digital/handle-approved-order";
import { isDigitalSmokeEnvironment, isDigitalTestOrder } from "@/lib/digital/smoke-guard";

/**
 * Simula pending → paid + entrega digital. Solo admin; solo pedidos marcados como prueba.
 */
export async function adminApproveDigitalTestOrder(orderId: string) {
  if (!isDigitalSmokeEnvironment()) {
    return { error: "Smoke digital deshabilitado en producción." };
  }

  await requireAdmin();
  const admin = createAdminClient();

  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("id, status, notes")
    .eq("id", orderId)
    .maybeSingle<{ id: string; status: string; notes: string | null }>();

  if (orderError || !order) {
    return { error: "Pedido no encontrado." };
  }

  if (!isDigitalTestOrder(order.notes)) {
    return { error: "Solo pedidos de prueba digital (marcador en notas)." };
  }

  if (order.status !== "pending") {
    if (order.status === "paid") {
      const delivery = await handleApprovedOrder(admin, orderId);
      return { ok: true, delivery, alreadyPaid: true };
    }
    return { error: "El pedido no está pendiente." };
  }

  const { error: updateError } = await admin
    .from("orders")
    .update({ status: "paid" })
    .eq("id", orderId)
    .eq("status", "pending");

  if (updateError) {
    return { error: "No se pudo marcar el pedido como pagado." };
  }

  const delivery = await handleApprovedOrder(admin, orderId);
  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${orderId}`);
  revalidatePath("/mis-compras");

  return { ok: true, delivery };
}
