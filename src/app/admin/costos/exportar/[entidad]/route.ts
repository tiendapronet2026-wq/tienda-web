import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

function csvCell(value: unknown): string {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

const exports = {
  proveedores: {
    table: "suppliers",
    columns: ["name", "legal_name", "contact_name", "email", "phone", "city", "province", "lead_time_days", "is_active", "updated_at"],
  },
  materiales: {
    table: "materials",
    columns: ["name", "sku", "unit_type", "current_cost", "currency", "waste_percentage", "suggested_margin_percentage", "current_stock", "is_active", "last_cost_update"],
  },
  historial: {
    table: "material_cost_history",
    columns: ["material_id", "supplier_id", "previous_cost", "new_cost", "currency", "quantity_purchased", "reference", "effective_date", "created_at"],
  },
  maquinas: {
    table: "machines",
    columns: ["name", "machine_type", "brand", "model", "power_watts", "energy_cost_per_hour", "maintenance_cost_per_hour", "depreciation_cost_per_hour", "additional_cost_per_hour", "total_cost_per_hour", "is_active", "updated_at"],
  },
  "mano-de-obra": {
    table: "labor_rates",
    columns: ["name", "description", "cost_per_hour", "suggested_sale_rate_per_hour", "currency", "is_active", "updated_at"],
  },
} as const;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ entidad: string }> },
) {
  await requireAdmin();
  const { entidad } = await params;
  const config = exports[entidad as keyof typeof exports];
  if (!config) return new Response("Exportación no válida", { status: 404 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from(config.table)
    .select(config.columns.join(","))
    .order("created_at", { ascending: false });
  if (error) return new Response("No se pudo exportar", { status: 500 });

  const headers = config.columns.join(",");
  const rows = (data ?? []).map((row) =>
    config.columns.map((column) => csvCell((row as unknown as Record<string, unknown>)[column])).join(","),
  );
  const csv = `\uFEFF${headers}\r\n${rows.join("\r\n")}`;
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="tiendapro-${entidad}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "no-store",
    },
  });
}
