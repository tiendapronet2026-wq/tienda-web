"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

function parseNum(raw: FormDataEntryValue | null, fallback = 0): number {
  if (raw == null || String(raw).trim() === "") return fallback;
  return Number(String(raw).replace(",", "."));
}

export async function createChannelProfile(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "El nombre es obligatorio." };

  const code = String(formData.get("code") ?? "").trim() || null;
  const { error } = await supabase.from("channel_cost_profiles").insert({
    name,
    code,
    channel_fee_percent: parseNum(formData.get("channel_fee_percent")),
    payment_fee_percent: parseNum(formData.get("payment_fee_percent")),
    fixed_fee_per_order: parseNum(formData.get("fixed_fee_per_order")),
    shipping_absorbed_per_order: parseNum(formData.get("shipping_absorbed_per_order")),
    other_cost_per_order: parseNum(formData.get("other_cost_per_order")),
    default_units_per_order: parseNum(formData.get("default_units_per_order"), 1),
    is_active: formData.get("is_active") === "on",
  });

  if (error) return { error: error.message };
  revalidatePath("/admin/perfiles-rentabilidad");
  return { success: "Perfil creado." };
}

export async function updateChannelProfile(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "El nombre es obligatorio." };

  const code = String(formData.get("code") ?? "").trim() || null;
  const { error } = await supabase
    .from("channel_cost_profiles")
    .update({
      name,
      code,
      channel_fee_percent: parseNum(formData.get("channel_fee_percent")),
      payment_fee_percent: parseNum(formData.get("payment_fee_percent")),
      fixed_fee_per_order: parseNum(formData.get("fixed_fee_per_order")),
      shipping_absorbed_per_order: parseNum(formData.get("shipping_absorbed_per_order")),
      other_cost_per_order: parseNum(formData.get("other_cost_per_order")),
      default_units_per_order: parseNum(formData.get("default_units_per_order"), 1),
      is_active: formData.get("is_active") === "on",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin/perfiles-rentabilidad");
  return { success: "Perfil actualizado." };
}

export async function simulateChannelProfitability(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const productId = String(formData.get("product_id"));
  const profileId = String(formData.get("profile_id"));
  if (!productId || !profileId) return { error: "Producto y perfil son obligatorios." };

  const overrideRaw = String(formData.get("final_price_override") ?? "").trim();
  const unitsRaw = String(formData.get("units_per_order") ?? "").trim();
  const override = overrideRaw ? Number(overrideRaw.replace(",", ".")) : null;
  const units = unitsRaw ? Number(unitsRaw.replace(",", ".")) : null;

  const { data, error } = await supabase.rpc("calculate_product_channel_profitability", {
    p_product_id: productId,
    p_profile_id: profileId,
    p_final_price_override: override != null && Number.isFinite(override) ? override : null,
    p_units_per_order: units != null && Number.isFinite(units) ? units : null,
  });

  if (error) return { error: error.message };
  return { data };
}
