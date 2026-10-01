"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

function text(form: FormData, key: string, max = 200): string {
  return String(form.get(key) ?? "").trim().slice(0, max);
}

function parseNonNegative(form: FormData, key: string): number {
  const raw = text(form, key, 40).replace(",", ".");
  const value = Number(raw);
  return Number.isFinite(value) ? value : Number.NaN;
}

function parsePositive(form: FormData, key: string): number {
  const value = parseNonNegative(form, key);
  return Number.isFinite(value) && value > 0 ? value : Number.NaN;
}

function validateResourceMinutes(run: number, setup: number): string | null {
  if (!Number.isFinite(run) || run < 0 || !Number.isFinite(setup) || setup < 0) {
    return "Los minutos deben ser números válidos (≥ 0).";
  }
  if (run <= 0 && setup <= 0) return "Indicá minutos de run o de setup.";
  return null;
}

export async function addProductProcessStep(form: FormData) {
  const { user } = await requireAdmin();
  const supabase = await createClient();
  const productId = text(form, "product_id", 50);
  const name = text(form, "name", 160);
  const batchSize = parsePositive(form, "batch_size");
  if (!productId || !name) return { error: "Nombre y producto son obligatorios." };
  if (!Number.isFinite(batchSize)) return { error: "El tamaño de lote debe ser mayor que cero." };

  const { data: maxRow } = await supabase
    .from("product_process_steps")
    .select("position")
    .eq("product_id", productId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const position = (maxRow?.position ?? 0) + 1;

  const { error } = await supabase.from("product_process_steps").insert({
    product_id: productId,
    name,
    position,
    batch_size: batchSize,
    created_by: user.id,
    updated_by: user.id,
  });
  if (error) return { error: "No se pudo crear el paso." };
  revalidatePath(`/admin/productos/${productId}`);
  return { success: "Paso creado." };
}

export async function updateProductProcessStep(form: FormData) {
  const { user } = await requireAdmin();
  const supabase = await createClient();
  const stepId = text(form, "step_id", 50);
  const productId = text(form, "product_id", 50);
  const name = text(form, "name", 160);
  const batchSize = parsePositive(form, "batch_size");
  if (!stepId || !productId || !name) return { error: "Paso inválido." };
  if (!Number.isFinite(batchSize)) return { error: "El tamaño de lote debe ser mayor que cero." };

  const { error } = await supabase
    .from("product_process_steps")
    .update({ name, batch_size: batchSize, updated_by: user.id })
    .eq("id", stepId)
    .eq("product_id", productId)
    .eq("is_active", true);

  if (error) return { error: "No se pudo actualizar el paso." };
  revalidatePath(`/admin/productos/${productId}`);
  return { success: "Paso actualizado." };
}

export async function deactivateProductProcessStep(form: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const stepId = text(form, "step_id", 50);
  const productId = text(form, "product_id", 50);
  if (!stepId || !productId) return { error: "Paso inválido." };

  const { error } = await supabase
    .from("product_process_steps")
    .update({ is_active: false })
    .eq("id", stepId)
    .eq("product_id", productId);

  if (error) return { error: "No se pudo desactivar el paso." };
  revalidatePath(`/admin/productos/${productId}`);
  return { success: "Paso desactivado." };
}

export async function moveProductProcessStep(form: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const stepId = text(form, "step_id", 50);
  const productId = text(form, "product_id", 50);
  const direction = text(form, "direction", 10);
  if (!stepId || !productId || (direction !== "up" && direction !== "down")) {
    return { error: "Movimiento inválido." };
  }

  const { data: current } = await supabase
    .from("product_process_steps")
    .select("id, position")
    .eq("id", stepId)
    .eq("product_id", productId)
    .eq("is_active", true)
    .maybeSingle();
  if (!current) return { error: "Paso no encontrado." };

  const neighborPos = direction === "up" ? current.position - 1 : current.position + 1;
  const { data: neighbor } = await supabase
    .from("product_process_steps")
    .select("id, position")
    .eq("product_id", productId)
    .eq("is_active", true)
    .eq("position", neighborPos)
    .maybeSingle();
  if (!neighbor) return { error: "No se puede mover más en esa dirección." };

  const tempPos = 999_999;
  const { error: e1 } = await supabase
    .from("product_process_steps")
    .update({ position: tempPos })
    .eq("id", current.id);
  if (e1) return { error: "No se pudo reordenar." };

  const { error: e2 } = await supabase
    .from("product_process_steps")
    .update({ position: current.position })
    .eq("id", neighbor.id);
  if (e2) return { error: "No se pudo reordenar." };

  const { error: e3 } = await supabase
    .from("product_process_steps")
    .update({ position: neighbor.position })
    .eq("id", current.id);
  if (e3) return { error: "No se pudo reordenar." };

  revalidatePath(`/admin/productos/${productId}`);
  return { success: "Orden actualizado." };
}

export async function addProductProcessResource(form: FormData) {
  const { user } = await requireAdmin();
  const supabase = await createClient();
  const stepId = text(form, "step_id", 50);
  const productId = text(form, "product_id", 50);
  const resourceType = text(form, "resource_type", 10);
  const machineId = text(form, "machine_id", 50);
  const laborRateId = text(form, "labor_rate_id", 50);
  const runMinutes = parseNonNegative(form, "run_minutes");
  const setupMinutes = parseNonNegative(form, "setup_minutes");

  if (!stepId || !productId) return { error: "Paso inválido." };
  const minuteErr = validateResourceMinutes(runMinutes, setupMinutes);
  if (minuteErr) return { error: minuteErr };

  if (resourceType === "machine") {
    if (!machineId) return { error: "Seleccioná una máquina." };
    const { data: machine } = await supabase
      .from("machines")
      .select("is_active")
      .eq("id", machineId)
      .maybeSingle();
    if (!machine?.is_active) return { error: "Solo se pueden agregar máquinas activas." };
  } else if (resourceType === "labor") {
    if (!laborRateId) return { error: "Seleccioná un concepto de mano de obra." };
    const { data: rate } = await supabase
      .from("labor_rates")
      .select("is_active")
      .eq("id", laborRateId)
      .maybeSingle();
    if (!rate?.is_active) return { error: "Solo se pueden agregar tarifas activas." };
  } else {
    return { error: "Tipo de recurso inválido." };
  }

  let existingQuery = supabase
    .from("product_process_resources")
    .select("id, is_active")
    .eq("process_step_id", stepId);
  existingQuery =
    resourceType === "machine"
      ? existingQuery.eq("machine_id", machineId)
      : existingQuery.eq("labor_rate_id", laborRateId);
  const { data: existing } = await existingQuery.maybeSingle();

  if (existing?.is_active) {
    return { error: "Ese recurso ya está asignado a este paso." };
  }

  const payload = {
    process_step_id: stepId,
    resource_type: resourceType,
    machine_id: resourceType === "machine" ? machineId : null,
    labor_rate_id: resourceType === "labor" ? laborRateId : null,
    run_minutes: runMinutes,
    setup_minutes: setupMinutes,
    created_by: user.id,
    updated_by: user.id,
    is_active: true,
  };

  if (existing && !existing.is_active) {
    const { error } = await supabase
      .from("product_process_resources")
      .update({
        run_minutes: runMinutes,
        setup_minutes: setupMinutes,
        is_active: true,
        updated_by: user.id,
      })
      .eq("id", existing.id);
    if (error) return { error: "No se pudo reactivar el recurso." };
  } else {
    const { error } = await supabase.from("product_process_resources").insert(payload);
    if (error) return { error: "No se pudo agregar el recurso." };
  }

  revalidatePath(`/admin/productos/${productId}`);
  return { success: "Recurso agregado." };
}

export async function updateProductProcessResource(form: FormData) {
  const { user } = await requireAdmin();
  const supabase = await createClient();
  const resourceId = text(form, "resource_id", 50);
  const productId = text(form, "product_id", 50);
  const runMinutes = parseNonNegative(form, "run_minutes");
  const setupMinutes = parseNonNegative(form, "setup_minutes");
  if (!resourceId || !productId) return { error: "Recurso inválido." };
  const minuteErr = validateResourceMinutes(runMinutes, setupMinutes);
  if (minuteErr) return { error: minuteErr };

  const { error } = await supabase
    .from("product_process_resources")
    .update({ run_minutes: runMinutes, setup_minutes: setupMinutes, updated_by: user.id })
    .eq("id", resourceId)
    .eq("is_active", true);

  if (error) return { error: "No se pudo actualizar el recurso." };
  revalidatePath(`/admin/productos/${productId}`);
  return { success: "Tiempos actualizados." };
}

export async function deactivateProductProcessResource(form: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const resourceId = text(form, "resource_id", 50);
  const productId = text(form, "product_id", 50);
  if (!resourceId || !productId) return { error: "Recurso inválido." };

  const { error } = await supabase
    .from("product_process_resources")
    .update({ is_active: false })
    .eq("id", resourceId);

  if (error) return { error: "No se pudo quitar el recurso." };
  revalidatePath(`/admin/productos/${productId}`);
  return { success: "Recurso desactivado." };
}
