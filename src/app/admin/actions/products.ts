"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { uniqueSlug } from "@/lib/slug";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function createProduct(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const payload = parseProductForm(formData);

  if ("error" in payload) return payload;

  const slug = await uniqueSlug(payload.name, async (candidate) => {
    const { data } = await supabase.from("products").select("id").eq("slug", candidate).maybeSingle();
    return !!data;
  });

  if (payload.sku) {
    const { data: existingSku } = await supabase
      .from("products")
      .select("id")
      .eq("sku", payload.sku)
      .maybeSingle();
    if (existingSku) return { error: "El SKU ya está en uso." };
  }

  const imageUrl = await uploadProductImage(formData.get("image") as File | null);

  const { data, error } = await supabase
    .from("products")
    .insert({ ...payload, slug, image_url: imageUrl, stock: 0 })
    .select("id")
    .single();

  if (error || !data) return { error: "No se pudo crear el producto." };

  if (payload.track_stock && payload.stock > 0) {
    await supabase.rpc("adjust_product_stock", {
      p_product_id: data.id,
      p_movement_type: "initial",
      p_quantity: payload.stock,
      p_reason: "Stock inicial",
    });
  }

  revalidatePath("/admin/productos");
  revalidatePath("/productos");
  redirect(`/admin/productos/${data.id}?mensaje=creado`);
}

export async function updateProduct(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const payload = parseProductForm(formData);

  if ("error" in payload) return payload;

  if (payload.sku) {
    const { data: existingSku } = await supabase
      .from("products")
      .select("id")
      .eq("sku", payload.sku)
      .neq("id", id)
      .maybeSingle();
    if (existingSku) return { error: "El SKU ya está en uso." };
  }

  const imageFile = formData.get("image") as File | null;
  const imageUrl = imageFile?.size ? await uploadProductImage(imageFile) : undefined;

  const { error } = await supabase
    .from("products")
    .update({
      ...payload,
      ...(imageUrl ? { image_url: imageUrl } : {}),
    })
    .eq("id", id);

  if (error) return { error: "No se pudo actualizar el producto." };

  revalidatePath("/admin/productos");
  revalidatePath(`/admin/productos/${id}`);
  revalidatePath("/productos");
  return { success: "Producto actualizado." };
}

export async function toggleProduct(id: string, isActive: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("products").update({ is_active: isActive }).eq("id", id);
  if (error) return { error: "No se pudo cambiar el estado." };

  revalidatePath("/admin/productos");
  revalidatePath("/productos");
  return { success: isActive ? "Producto activado." : "Producto desactivado." };
}

export async function adjustStock(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const productId = String(formData.get("product_id"));
  const movementType = String(formData.get("movement_type"));
  const quantity = Number(formData.get("quantity"));
  const reason = String(formData.get("reason") ?? "").trim() || null;

  const { error } = await supabase.rpc("adjust_product_stock", {
    p_product_id: productId,
    p_movement_type: movementType,
    p_quantity: quantity,
    p_reason: reason,
  });

  if (error) return { error: error.message };

  revalidatePath(`/admin/productos/${productId}`);
  revalidatePath("/admin/productos");
  return { success: "Stock actualizado." };
}

function parseProductForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const categoryId = String(formData.get("category_id") ?? "") || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const shortDescription = String(formData.get("short_description") ?? "").trim() || null;
  const sku = String(formData.get("sku") ?? "").trim() || null;
  const price = Number(formData.get("price"));
  const compareAtPrice = formData.get("compare_at_price")
    ? Number(formData.get("compare_at_price"))
    : null;
  const costPrice = formData.get("cost_price") ? Number(formData.get("cost_price")) : null;
  const stock = Number(formData.get("stock") ?? 0);
  const lowStockThreshold = Number(formData.get("low_stock_threshold") ?? 5);
  const trackStock = formData.get("track_stock") === "on";
  const isActive = formData.get("is_active") === "on";
  const isFeatured = formData.get("is_featured") === "on";

  if (!name || Number.isNaN(price) || price < 0) {
    return { error: "Nombre y precio válido son obligatorios." };
  }

  return {
    name,
    category_id: categoryId,
    description,
    short_description: shortDescription,
    sku,
    price,
    compare_at_price: compareAtPrice,
    cost_price: costPrice,
    stock: trackStock ? stock : 0,
    low_stock_threshold: lowStockThreshold,
    track_stock: trackStock,
    is_active: isActive,
    is_featured: isFeatured,
  };
}

async function uploadProductImage(file: File | null) {
  if (!file || file.size === 0) return null;
  if (file.size > MAX_IMAGE_SIZE) throw new Error("La imagen supera los 5 MB.");
  if (!ALLOWED_TYPES.includes(file.type)) throw new Error("Tipo de archivo no permitido.");

  const admin = createAdminClient();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const safeName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await admin.storage.from("product-images").upload(safeName, buffer, {
    contentType: file.type,
    upsert: false,
  });

  if (error) throw new Error("Error al subir la imagen.");

  const { data } = admin.storage.from("product-images").getPublicUrl(safeName);
  return data.publicUrl;
}
