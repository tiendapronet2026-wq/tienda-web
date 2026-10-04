"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

export async function upsertDigitalDeliveryResource(formData: FormData) {
  await requireAdmin();
  const productId = String(formData.get("product_id") ?? "").trim();
  const externalResourceId = String(formData.get("external_resource_id") ?? "").trim();
  const label = String(formData.get("label") ?? "Contenido principal").trim() || "Contenido principal";

  if (!productId || !externalResourceId) {
    return { error: "Producto e ID de recurso (Drive) son obligatorios." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("digital_delivery_resources").upsert(
    {
      product_id: productId,
      provider: "google_drive",
      external_resource_id: externalResourceId,
      label,
      active: true,
    },
    { onConflict: "product_id,provider,label" },
  );

  if (error) {
    return { error: "No se pudo guardar el recurso de entrega." };
  }

  revalidatePath(`/admin/productos/${productId}`);
  return { success: "Recurso de entrega guardado." };
}
