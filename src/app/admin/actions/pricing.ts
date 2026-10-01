"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
function text(form: FormData, key: string, max = 200): string {
  return String(form.get(key) ?? "").trim().slice(0, max);
}

function parseMarginPercent(form: FormData, key: string): number {
  const raw = text(form, key, 40).replace(",", ".");
  const value = Number(raw);
  return Number.isFinite(value) ? value : Number.NaN;
}

export async function updateProductTargetMargin(form: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const productId = text(form, "product_id", 50);
  const margin = parseMarginPercent(form, "target_sale_margin_percent");
  if (!productId) return { error: "Producto inválido." };
  if (!Number.isFinite(margin) || margin < 0 || margin >= 100) {
    return { error: "Margen sobre venta: entre 0 y menos de 100 %." };
  }

  const { error } = await supabase
    .from("products")
    .update({ target_sale_margin_percent: margin })
    .eq("id", productId);

  if (error) return { error: "No se pudo guardar el margen objetivo." };
  revalidatePath(`/admin/productos/${productId}`);
  return { success: "Margen objetivo guardado." };
}

export async function captureProductCostSnapshot(form: FormData) {
  const { user } = await requireAdmin();
  const supabase = await createClient();
  const productId = text(form, "product_id", 50);
  const reason = text(form, "reason", 500);
  if (!productId) return { error: "Producto inválido." };

  const { data: breakdown, error: rpcError } = await supabase.rpc(
    "calculate_product_production_cost",
    { p_product_id: productId },
  );
  if (rpcError || !breakdown || typeof breakdown !== "object") {
    return { error: "No se pudo leer el costo calculado." };
  }

  const o = breakdown as Record<string, unknown>;
  const num = (k: string) => Number(o[k]);
  const payload = {
    product_id: productId,
    materials_cost: num("materials_cost"),
    machine_cost: num("machine_cost"),
    labor_cost: num("labor_cost"),
    total_cost: num("total_cost"),
    reason: reason || "Captura manual Gate 3A",
    metadata: { source: "gate_3a_manual" },
    created_by: user.id,
  };

  const { error } = await supabase.from("product_cost_snapshots").insert(payload);
  if (error) return { error: "No se pudo guardar el snapshot." };
  revalidatePath(`/admin/productos/${productId}`);
  return { success: "Snapshot de costo registrado." };
}

function parseOptionalPrice(form: FormData, key: string): number | null {
  const raw = text(form, key, 40).replace(",", ".");
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : Number.NaN;
}

export async function adoptProductPricing(form: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const productId = text(form, "product_id", 50);
  const reason = text(form, "reason", 500);
  const idempotencyKey = text(form, "idempotency_key", 120);
  const useSuggested = text(form, "adopt_mode", 20) === "suggested";
  const customPrice = parseOptionalPrice(form, "custom_adopted_price");

  if (!productId) return { error: "Producto inválido." };
  if (!idempotencyKey || idempotencyKey.length < 8) {
    return { error: "Clave de idempotencia inválida." };
  }

  let adoptedPrice: number | null = null;
  if (!useSuggested) {
    if (customPrice == null || !Number.isFinite(customPrice) || customPrice < 0) {
      return { error: "Indicá un precio adoptado válido." };
    }
    adoptedPrice = customPrice;
  }

  const { data, error } = await supabase.rpc("adopt_product_pricing", {
    p_product_id: productId,
    p_adopted_price: adoptedPrice,
    p_reason: reason || null,
    p_idempotency_key: idempotencyKey,
  });

  if (error) return { error: error.message.includes("Acceso denegado") ? "Acceso denegado." : "No se pudo adoptar el precio." };
  if (!data || typeof data !== "object") return { error: "Respuesta inválida." };

  const replay = Boolean((data as Record<string, unknown>).idempotent_replay);
  revalidatePath(`/admin/productos/${productId}`);
  revalidatePath("/productos");
  revalidatePath("/checkout");
  return {
    success: replay
      ? "Operación ya registrada (idempotencia)."
      : `Precio adoptado: ${(data as Record<string, unknown>).adopted_price}`,
  };
}
