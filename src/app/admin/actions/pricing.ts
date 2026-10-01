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
