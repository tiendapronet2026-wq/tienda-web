"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/session";

export async function updateProfile(formData: FormData) {
  const user = await requireAuth();
  const supabase = await createClient();

  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const documentNumber = String(formData.get("document_number") ?? "").trim() || null;

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      phone,
      document_number: documentNumber,
    })
    .eq("id", user.id);

  if (error) {
    return { error: "No se pudo actualizar el perfil." };
  }

  revalidatePath("/mi-cuenta");
  return { success: "Perfil actualizado correctamente." };
}

export async function changePassword(formData: FormData) {
  const supabase = await createClient();
  await requireAuth();

  const password = String(formData.get("password") ?? "");
  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: "No se pudo cambiar la contraseña." };
  }

  return { success: "Contraseña actualizada correctamente." };
}
