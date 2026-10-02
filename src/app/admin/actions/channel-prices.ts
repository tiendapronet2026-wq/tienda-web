"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

function text(form: FormData, key: string, max = 200): string {
  return String(form.get(key) ?? "").trim().slice(0, max);
}

function parseOptionalNum(raw: string): number | null {
  if (!raw) return null;
  const value = Number(raw.replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

export async function adoptProductChannelPrice(form: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const productId = text(form, "product_id", 50);
  const profileId = text(form, "profile_id", 50);
  if (!productId || !profileId) return { error: "Producto y perfil son obligatorios." };

  const idempotencyKey = text(form, "idempotency_key", 120);
  if (!idempotencyKey || idempotencyKey.length < 8) {
    return { error: "Clave de idempotencia inválida." };
  }

  const adoptedRaw = text(form, "adopted_price", 40);
  const adopted = adoptedRaw ? parseOptionalNum(adoptedRaw) : null;
  if (adoptedRaw && adopted === null) return { error: "Precio adoptado inválido." };

  const unitsRaw = text(form, "units_per_order", 40);
  const units = unitsRaw ? parseOptionalNum(unitsRaw) : null;

  const { data, error } = await supabase.rpc("adopt_product_channel_price", {
    p_product_id: productId,
    p_profile_id: profileId,
    p_adopted_price: adopted,
    p_reason: text(form, "reason", 500) || null,
    p_idempotency_key: idempotencyKey,
    p_units_per_order: units,
  });

  if (error) return { error: error.message };
  revalidatePath(`/admin/productos/${productId}`);
  return { data };
}

export async function revertProductChannelPrice(form: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const productId = text(form, "product_id", 50);
  const profileId = text(form, "profile_id", 50);
  if (!productId || !profileId) return { error: "Producto y perfil son obligatorios." };

  const idempotencyKey = text(form, "idempotency_key", 120);
  if (!idempotencyKey || idempotencyKey.length < 8) {
    return { error: "Clave de idempotencia inválida." };
  }

  const { data, error } = await supabase.rpc("revert_product_channel_price", {
    p_product_id: productId,
    p_profile_id: profileId,
    p_reason: text(form, "reason", 500) || null,
    p_idempotency_key: idempotencyKey,
  });

  if (error) return { error: error.message };
  revalidatePath(`/admin/productos/${productId}`);
  return { data };
}
