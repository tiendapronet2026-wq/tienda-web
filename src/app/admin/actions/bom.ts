"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

function text(form: FormData, key: string, max = 200): string {
  return String(form.get(key) ?? "").trim().slice(0, max);
}

function parseQuantity(form: FormData, key: string): number {
  const raw = text(form, key, 40).replace(",", ".");
  const value = Number(raw);
  return Number.isFinite(value) ? value : Number.NaN;
}

export async function addProductBomLine(form: FormData) {
  const { user } = await requireAdmin();
  const supabase = await createClient();
  const productId = text(form, "product_id", 50);
  const materialId = text(form, "material_id", 50);
  const quantity = parseQuantity(form, "quantity");
  if (!productId || !materialId) return { error: "Producto o material inválido." };
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { error: "La cantidad debe ser mayor que cero." };
  }

  const { data: material } = await supabase
    .from("materials")
    .select("is_active")
    .eq("id", materialId)
    .maybeSingle();
  if (!material?.is_active) {
    return { error: "Solo se pueden agregar materiales activos." };
  }

  const { data: existing } = await supabase
    .from("product_bom_lines")
    .select("id, is_active")
    .eq("product_id", productId)
    .eq("material_id", materialId)
    .is("product_variant_id", null)
    .maybeSingle();

  if (existing) {
    if (existing.is_active) return { error: "Ese material ya está en la BOM de este producto." };
    const { error } = await supabase
      .from("product_bom_lines")
      .update({
        quantity,
        is_active: true,
        notes: text(form, "notes", 2000) || null,
        updated_by: user.id,
      })
      .eq("id", existing.id);
    if (error) return { error: "No se pudo reactivar el componente." };
  } else {
    const { error } = await supabase.from("product_bom_lines").insert({
      product_id: productId,
      material_id: materialId,
      quantity,
      notes: text(form, "notes", 2000) || null,
      created_by: user.id,
      updated_by: user.id,
    });
    if (error) return { error: "No se pudo agregar el material a la BOM." };
  }

  revalidatePath(`/admin/productos/${productId}`);
  return { success: "Componente agregado." };
}

export async function updateProductBomLineQuantity(form: FormData) {
  const { user } = await requireAdmin();
  const supabase = await createClient();
  const lineId = text(form, "line_id", 50);
  const productId = text(form, "product_id", 50);
  const quantity = parseQuantity(form, "quantity");
  if (!lineId || !productId) return { error: "Línea inválida." };
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { error: "La cantidad debe ser mayor que cero." };
  }

  const { error } = await supabase
    .from("product_bom_lines")
    .update({ quantity, updated_by: user.id })
    .eq("id", lineId)
    .eq("product_id", productId)
    .eq("is_active", true);

  if (error) return { error: "No se pudo actualizar la cantidad." };
  revalidatePath(`/admin/productos/${productId}`);
  return { success: "Cantidad actualizada." };
}

export async function deactivateProductBomLine(form: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const lineId = text(form, "line_id", 50);
  const productId = text(form, "product_id", 50);
  if (!lineId || !productId) return { error: "Línea inválida." };

  const { error } = await supabase
    .from("product_bom_lines")
    .update({ is_active: false })
    .eq("id", lineId)
    .eq("product_id", productId);

  if (error) return { error: "No se pudo quitar el componente." };
  revalidatePath(`/admin/productos/${productId}`);
  return { success: "Componente desactivado." };
}
