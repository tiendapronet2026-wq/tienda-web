"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isQuoteStatus } from "@/lib/quotes";

export async function updateQuoteStatus(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!id || !isQuoteStatus(status)) {
    return { error: "Estado inválido." };
  }

  const { error } = await supabase.from("quote_requests").update({ status }).eq("id", id);
  if (error) return { error: "No se pudo actualizar el estado." };

  revalidatePath("/admin/cotizaciones");
  revalidatePath(`/admin/cotizaciones/${id}`);
  return { success: true };
}

export async function updateQuoteNotes(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const notes = String(formData.get("internal_notes") ?? "").trim().slice(0, 5000);

  if (!id) return { error: "Solicitud inválida." };

  const { error } = await supabase
    .from("quote_requests")
    .update({ internal_notes: notes || null })
    .eq("id", id);

  if (error) return { error: "No se pudieron guardar las notas." };

  revalidatePath(`/admin/cotizaciones/${id}`);
  return { success: true };
}

export async function getSignedQuoteAttachmentUrl(attachmentId: string) {
  await requireAdmin();
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: attachment, error } = await supabase
    .from("quote_attachments")
    .select("id, storage_path, original_filename")
    .eq("id", attachmentId)
    .maybeSingle();

  if (error || !attachment) {
    return { error: "Archivo no encontrado." };
  }

  const { data, error: signedError } = await admin.storage
    .from("quote-attachments")
    .createSignedUrl(attachment.storage_path, 60 * 10);

  if (signedError || !data?.signedUrl) {
    return { error: "No se pudo generar el enlace de descarga." };
  }

  return { url: data.signedUrl, filename: attachment.original_filename };
}
