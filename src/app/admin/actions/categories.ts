"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { slugify, uniqueSlug } from "@/lib/slug";

export async function createCategory(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const sortOrder = Number(formData.get("sort_order") ?? 0);

  if (!name) redirect("/admin/categorias?error=nombre");

  const slug = await uniqueSlug(name, async (candidate) => {
    const { data } = await supabase.from("categories").select("id").eq("slug", candidate).maybeSingle();
    return !!data;
  });

  const { error } = await supabase.from("categories").insert({
    name,
    slug,
    description,
    sort_order: sortOrder,
    is_active: true,
  });

  if (error) redirect("/admin/categorias?error=crear");

  revalidatePath("/admin/categorias");
  revalidatePath("/productos");
  redirect("/admin/categorias?mensaje=creado");
}

export async function updateCategory(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const id = String(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const sortOrder = Number(formData.get("sort_order") ?? 0);
  const isActive = formData.get("is_active") === "on";

  const { error } = await supabase
    .from("categories")
    .update({ name, description, sort_order: sortOrder, is_active: isActive })
    .eq("id", id);

  if (error) return { error: "No se pudo actualizar la categoría." };

  revalidatePath("/admin/categorias");
  revalidatePath("/productos");
  return { success: "Categoría actualizada." };
}

export async function toggleCategory(id: string, isActive: boolean) {
  await requireAdmin();
  const supabase = await createClient();

  const { count } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id)
    .eq("is_active", true);

  if (!isActive && (count ?? 0) > 0) {
    return { error: "No se puede desactivar: tiene productos activos asociados." };
  }

  const { error } = await supabase.from("categories").update({ is_active: isActive }).eq("id", id);
  if (error) return { error: "No se pudo cambiar el estado." };

  revalidatePath("/admin/categorias");
  revalidatePath("/productos");
  return { success: isActive ? "Categoría activada." : "Categoría desactivada." };
}

export async function generateCategorySlug(name: string) {
  return slugify(name);
}
