"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { calculateDepreciationCost, calculateEnergyCost } from "@/lib/cost-engine";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(form: FormData, key: string, max = 5000): string {
  return String(form.get(key) ?? "").trim().slice(0, max);
}

function nullable(form: FormData, key: string, max = 5000): string | null {
  return text(form, key, max) || null;
}

function numberValue(form: FormData, key: string, fallback = 0): number {
  const raw = text(form, key, 40).replace(",", ".");
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : Number.NaN;
}

function nullableNumber(form: FormData, key: string): number | null {
  if (!text(form, key, 40)) return null;
  const value = numberValue(form, key);
  return Number.isFinite(value) ? value : Number.NaN;
}

async function audit(
  entityType: string,
  entityId: string,
  action: string,
  oldValues: unknown,
  newValues: unknown,
) {
  const { user } = await requireAdmin();
  const supabase = await createClient();
  await supabase.from("cost_audit_log").insert({
    entity_type: entityType,
    entity_id: entityId,
    action,
    old_values: oldValues,
    new_values: newValues,
    user_id: user.id,
  });
}

export async function saveSupplier(form: FormData) {
  const { user } = await requireAdmin();
  const supabase = await createClient();
  const id = text(form, "id", 50);
  const name = text(form, "name", 160);
  const email = nullable(form, "email", 254);
  const leadTime = nullableNumber(form, "lead_time_days");
  if (name.length < 2) return { error: "Ingresá el nombre del proveedor." };
  if (email && !emailPattern.test(email)) return { error: "El email no es válido." };
  if (leadTime !== null && (!Number.isInteger(leadTime) || leadTime < 0)) {
    return { error: "El plazo de entrega debe ser un entero positivo." };
  }

  const payload = {
    name,
    legal_name: nullable(form, "legal_name", 180),
    tax_id: nullable(form, "tax_id", 80),
    contact_name: nullable(form, "contact_name", 160),
    email,
    phone: nullable(form, "phone", 60),
    whatsapp: nullable(form, "whatsapp", 60),
    website: nullable(form, "website", 300),
    address: nullable(form, "address", 300),
    city: nullable(form, "city", 120),
    province: nullable(form, "province", 120),
    country: text(form, "country", 120) || "Argentina",
    notes: nullable(form, "notes"),
    payment_terms: nullable(form, "payment_terms", 500),
    lead_time_days: leadTime,
    is_active: form.get("is_active") === "on" || !id,
    updated_by: user.id,
  };

  if (id) {
    const { data: before } = await supabase.from("suppliers").select("*").eq("id", id).single();
    const { error } = await supabase.from("suppliers").update(payload).eq("id", id);
    if (error) return { error: "No se pudo actualizar el proveedor." };
    await audit("supplier", id, "updated", before, payload);
    revalidatePath("/admin/proveedores");
    revalidatePath(`/admin/proveedores/${id}`);
    return { success: "Proveedor actualizado." };
  }

  const { data, error } = await supabase
    .from("suppliers")
    .insert({ ...payload, created_by: user.id })
    .select("id")
    .single();
  if (error || !data) return { error: "No se pudo crear el proveedor." };
  await audit("supplier", data.id, "created", null, payload);
  redirect(`/admin/proveedores/${data.id}?mensaje=creado`);
}

export async function toggleSupplier(id: string, isActive: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("suppliers").update({ is_active: isActive }).eq("id", id);
  if (error) return { error: "No se pudo cambiar el estado." };
  await audit("supplier", id, isActive ? "reactivated" : "deactivated", null, { is_active: isActive });
  revalidatePath("/admin/proveedores");
  revalidatePath(`/admin/proveedores/${id}`);
  return { success: isActive ? "Proveedor reactivado." : "Proveedor desactivado." };
}

export async function saveMaterial(form: FormData) {
  const { user } = await requireAdmin();
  const supabase = await createClient();
  const id = text(form, "id", 50);
  const name = text(form, "name", 180);
  const unitType = text(form, "unit_type", 60);
  const waste = numberValue(form, "waste_percentage");
  const margin = numberValue(form, "suggested_margin_percentage");
  const minimumStock = nullableNumber(form, "minimum_stock");
  const currentStock = nullableNumber(form, "current_stock");
  if (name.length < 2 || !unitType) return { error: "Nombre y unidad son obligatorios." };
  if (waste < 0 || waste > 100 || margin < 0) return { error: "Revisá merma y margen." };
  if ((minimumStock !== null && minimumStock < 0) || (currentStock !== null && currentStock < 0)) {
    return { error: "El stock no puede ser negativo." };
  }

  const payload = {
    category_id: nullable(form, "category_id", 50),
    name,
    sku: nullable(form, "sku", 100),
    description: nullable(form, "description"),
    unit_type: unitType,
    currency: (text(form, "currency", 3) || "ARS").toUpperCase(),
    waste_percentage: waste,
    suggested_margin_percentage: margin,
    minimum_stock: minimumStock,
    current_stock: currentStock,
    stock_tracking_enabled: form.get("stock_tracking_enabled") === "on",
    preferred_supplier_id: nullable(form, "preferred_supplier_id", 50),
    is_active: form.get("is_active") === "on" || !id,
    notes: nullable(form, "notes"),
    updated_by: user.id,
  };

  if (id) {
    const { data: before } = await supabase.from("materials").select("*").eq("id", id).single();
    const { error } = await supabase.from("materials").update(payload).eq("id", id);
    if (error) return { error: error.code === "23505" ? "El SKU ya existe." : "No se pudo actualizar." };
    if (payload.preferred_supplier_id) {
      await supabase.from("supplier_materials").update({ is_preferred: false }).eq("material_id", id);
      await supabase.from("supplier_materials").upsert(
        {
          supplier_id: payload.preferred_supplier_id,
          material_id: id,
          is_preferred: true,
          currency: payload.currency,
        },
        { onConflict: "supplier_id,material_id" },
      );
    } else {
      await supabase.from("supplier_materials").update({ is_preferred: false }).eq("material_id", id);
    }
    if (
      before?.waste_percentage !== waste ||
      before?.suggested_margin_percentage !== margin ||
      before?.preferred_supplier_id !== payload.preferred_supplier_id
    ) {
      await audit("material", id, "cost_parameters_updated", before, payload);
    }
    revalidatePath("/admin/materiales");
    revalidatePath(`/admin/materiales/${id}`);
    return { success: "Material actualizado." };
  }

  const initialCost = numberValue(form, "initial_cost");
  if (initialCost < 0) return { error: "El costo inicial no puede ser negativo." };
  const { data, error } = await supabase
    .from("materials")
    .insert({
      ...payload,
      current_cost: 0,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !data) return { error: error?.code === "23505" ? "El SKU ya existe." : "No se pudo crear." };
  if (payload.preferred_supplier_id) {
    await supabase.from("supplier_materials").insert({
      supplier_id: payload.preferred_supplier_id,
      material_id: data.id,
      is_preferred: true,
      currency: payload.currency,
    });
  }
  if (initialCost > 0) {
    const { error: costError } = await supabase.rpc("update_material_cost", {
      p_material_id: data.id,
      p_new_cost: initialCost,
      p_supplier_id: payload.preferred_supplier_id,
      p_currency: payload.currency,
      p_reference: "Costo inicial",
    });
    if (costError) return { error: "Material creado, pero no se pudo registrar el costo inicial." };
  }
  redirect(`/admin/materiales/${data.id}?mensaje=creado`);
}

export async function toggleMaterial(id: string, isActive: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("materials").update({ is_active: isActive }).eq("id", id);
  if (error) return { error: "No se pudo cambiar el estado." };
  revalidatePath("/admin/materiales");
  return { success: isActive ? "Material reactivado." : "Material desactivado." };
}

export async function linkSupplierMaterial(form: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const materialId = text(form, "material_id", 50);
  const supplierId = text(form, "supplier_id", 50);
  const preferred = form.get("is_preferred") === "on";
  if (!materialId || !supplierId) return { error: "Seleccioná un proveedor." };

  if (preferred) {
    await supabase.from("supplier_materials").update({ is_preferred: false }).eq("material_id", materialId);
  }
  const payload = {
    supplier_id: supplierId,
    material_id: materialId,
    supplier_sku: nullable(form, "supplier_sku", 100),
    purchase_unit: nullable(form, "purchase_unit", 80),
    unit_conversion_factor: numberValue(form, "unit_conversion_factor", 1),
    latest_purchase_price: nullableNumber(form, "latest_purchase_price"),
    currency: (text(form, "currency", 3) || "ARS").toUpperCase(),
    minimum_order_quantity: nullableNumber(form, "minimum_order_quantity"),
    lead_time_days: nullableNumber(form, "lead_time_days"),
    is_preferred: preferred,
    notes: nullable(form, "notes"),
  };
  const { error } = await supabase.from("supplier_materials").upsert(payload, {
    onConflict: "supplier_id,material_id",
  });
  if (error) return { error: "No se pudo asociar el proveedor." };
  if (preferred) {
    await supabase.from("materials").update({ preferred_supplier_id: supplierId }).eq("id", materialId);
    await audit("material", materialId, "preferred_supplier_updated", null, { supplier_id: supplierId });
  }
  revalidatePath(`/admin/materiales/${materialId}`);
  return { success: "Proveedor asociado." };
}

export async function updateMaterialCost(form: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const materialId = text(form, "material_id", 50);
  const newCost = numberValue(form, "new_cost", Number.NaN);
  if (!materialId || !Number.isFinite(newCost) || newCost < 0) return { error: "Costo inválido." };
  const { error } = await supabase.rpc("update_material_cost", {
    p_material_id: materialId,
    p_new_cost: newCost,
    p_supplier_id: nullable(form, "supplier_id", 50),
    p_currency: (text(form, "currency", 3) || "ARS").toUpperCase(),
    p_quantity_purchased: nullableNumber(form, "quantity_purchased"),
    p_purchase_unit: nullable(form, "purchase_unit", 80),
    p_reference: nullable(form, "reference", 200),
    p_notes: nullable(form, "notes"),
    p_effective_date: text(form, "effective_date", 10) || new Date().toISOString().slice(0, 10),
  });
  if (error) return { error: "No se pudo registrar el cambio de costo." };
  revalidatePath("/admin/materiales");
  revalidatePath(`/admin/materiales/${materialId}`);
  revalidatePath(`/admin/materiales/${materialId}/costos`);
  return { success: "Costo e historial actualizados." };
}

export async function saveMachine(form: FormData) {
  const { user } = await requireAdmin();
  const supabase = await createClient();
  const id = text(form, "id", 50);
  const name = text(form, "name", 180);
  const machineType = text(form, "machine_type", 60);
  if (name.length < 2 || !machineType) return { error: "Nombre y tipo son obligatorios." };

  const purchasePrice = nullableNumber(form, "purchase_price");
  const lifeHours = nullableNumber(form, "estimated_useful_life_hours");
  const powerWatts = nullableNumber(form, "power_watts");
  const { data: settings } = await supabase
    .from("business_cost_settings")
    .select("electricity_price_per_kwh")
    .eq("is_active", true)
    .maybeSingle();
  const autoEnergy = form.get("auto_energy") === "on";
  const autoDepreciation = form.get("auto_depreciation") === "on";
  const energy =
    autoEnergy && powerWatts != null && (settings?.electricity_price_per_kwh ?? 0) > 0
      ? calculateEnergyCost(powerWatts, Number(settings?.electricity_price_per_kwh))
      : numberValue(form, "energy_cost_per_hour");
  const depreciation =
    autoDepreciation && purchasePrice != null && lifeHours != null && lifeHours > 0
      ? calculateDepreciationCost(purchasePrice, lifeHours)
      : numberValue(form, "depreciation_cost_per_hour");

  const payload = {
    name,
    machine_type: machineType,
    brand: nullable(form, "brand", 120),
    model: nullable(form, "model", 120),
    serial_number: nullable(form, "serial_number", 120),
    purchase_date: nullable(form, "purchase_date", 10),
    purchase_price: purchasePrice,
    estimated_useful_life_hours: lifeHours,
    accumulated_usage_hours: numberValue(form, "accumulated_usage_hours"),
    power_watts: powerWatts,
    maintenance_cost_per_hour: numberValue(form, "maintenance_cost_per_hour"),
    depreciation_cost_per_hour: depreciation,
    energy_cost_per_hour: energy,
    additional_cost_per_hour: numberValue(form, "additional_cost_per_hour"),
    setup_minutes_default: numberValue(form, "setup_minutes_default"),
    is_active: form.get("is_active") === "on" || !id,
    notes: nullable(form, "notes"),
    updated_by: user.id,
  };
  if (Object.values(payload).some((value) => typeof value === "number" && (!Number.isFinite(value) || value < 0))) {
    return { error: "Los costos y horas no pueden ser negativos." };
  }

  if (id) {
    const { data: before } = await supabase.from("machines").select("*").eq("id", id).single();
    const { error } = await supabase.from("machines").update(payload).eq("id", id);
    if (error) return { error: "No se pudo actualizar la máquina." };
    await audit("machine", id, "cost_updated", before, payload);
    revalidatePath("/admin/maquinas");
    revalidatePath(`/admin/maquinas/${id}`);
    return { success: "Máquina actualizada." };
  }
  const { data, error } = await supabase
    .from("machines")
    .insert({ ...payload, created_by: user.id })
    .select("id")
    .single();
  if (error || !data) return { error: "No se pudo crear la máquina." };
  await audit("machine", data.id, "created", null, payload);
  redirect(`/admin/maquinas/${data.id}?mensaje=creada`);
}

export async function saveLaborRate(form: FormData) {
  const { user } = await requireAdmin();
  const supabase = await createClient();
  const id = text(form, "id", 50);
  const payload = {
    name: text(form, "name", 160),
    description: nullable(form, "description"),
    cost_per_hour: numberValue(form, "cost_per_hour", Number.NaN),
    suggested_sale_rate_per_hour: nullableNumber(form, "suggested_sale_rate_per_hour"),
    currency: (text(form, "currency", 3) || "ARS").toUpperCase(),
    is_active: form.get("is_active") === "on" || !id,
    updated_by: user.id,
  };
  if (payload.name.length < 2 || !Number.isFinite(payload.cost_per_hour) || payload.cost_per_hour < 0) {
    return { error: "Revisá el concepto y su costo." };
  }
  if (id) {
    const { error } = await supabase.from("labor_rates").update(payload).eq("id", id);
    if (error) return { error: "No se pudo actualizar." };
  } else {
    const { error } = await supabase.from("labor_rates").insert({ ...payload, created_by: user.id });
    if (error) return { error: "No se pudo crear." };
  }
  revalidatePath("/admin/mano-de-obra");
  return { success: id ? "Concepto actualizado." : "Concepto creado." };
}

export async function saveCostSettings(form: FormData) {
  const { user } = await requireAdmin();
  const supabase = await createClient();
  const id = text(form, "id", 50);
  const { data: before } = await supabase.from("business_cost_settings").select("*").eq("id", id).single();
  const payload = {
    electricity_price_per_kwh: numberValue(form, "electricity_price_per_kwh"),
    default_profit_margin_percentage: numberValue(form, "default_profit_margin_percentage"),
    default_waste_percentage: numberValue(form, "default_waste_percentage"),
    tax_percentage: numberValue(form, "tax_percentage"),
    fixed_overhead_percentage: numberValue(form, "fixed_overhead_percentage"),
    currency: (text(form, "currency", 3) || "ARS").toUpperCase(),
    cost_stale_days: numberValue(form, "cost_stale_days", 30),
    updated_by: user.id,
  };
  if (
    payload.electricity_price_per_kwh < 0 ||
    payload.default_profit_margin_percentage < 0 ||
    payload.default_waste_percentage < 0 ||
    payload.default_waste_percentage > 100 ||
    payload.tax_percentage < 0 ||
    payload.tax_percentage > 100 ||
    payload.fixed_overhead_percentage < 0 ||
    !Number.isInteger(payload.cost_stale_days) ||
    payload.cost_stale_days < 1
  ) {
    return { error: "Revisá los valores de configuración." };
  }
  const { error } = await supabase.from("business_cost_settings").update(payload).eq("id", id);
  if (error) return { error: "No se pudo guardar la configuración." };
  await audit("business_cost_settings", id, "updated", before, payload);
  revalidatePath("/admin/configuracion/costos");
  revalidatePath("/admin/costos");
  return { success: "Configuración actualizada." };
}
