import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { MachineCalculator, MachineForm } from "@/components/admin/CostForms";
import { Badge } from "@/components/ui/Badge";
import { formatCost, formatDate } from "@/lib/utils";

export default async function MachineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: machine }, { data: settings }] = await Promise.all([
    supabase.from("machines").select("*").eq("id", id).maybeSingle(),
    supabase.from("business_cost_settings").select("electricity_price_per_kwh").eq("is_active", true).single(),
  ]);
  if (!machine) notFound();
  const warnings = [
    Number(settings?.electricity_price_per_kwh ?? 0) <= 0 && "Falta el precio de electricidad.",
    machine.power_watts == null && "Falta la potencia del equipo.",
    machine.estimated_useful_life_hours == null && "Falta la vida útil estimada.",
    Number(machine.total_cost_per_hour) === 0 && "El costo total por hora es cero.",
  ].filter(Boolean) as string[];
  return <div className="max-w-6xl"><Link href="/admin/maquinas" className="text-sm text-brand hover:underline">← Máquinas</Link><div className="mt-4 mb-8 flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-3"><h1 className="text-3xl font-bold tracking-tight">{machine.name}</h1><Badge tone={machine.is_active ? "active" : "inactive"}>{machine.is_active ? "Activa" : "Inactiva"}</Badge></div><p className="mt-2 text-text-secondary">Costo total: <strong>{formatCost(Number(machine.total_cost_per_hour))} / hora</strong> · actualizado {formatDate(machine.cost_updated_at)}</p></div></div>
    {warnings.length > 0 && <div className="mb-6 rounded-xl bg-warning-soft p-4 text-sm text-warning"><strong>Datos pendientes:</strong><ul className="mt-2 list-disc pl-5">{warnings.map((w) => <li key={w}>{w}</li>)}</ul></div>}
    <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[["Energía",machine.energy_cost_per_hour],["Mantenimiento",machine.maintenance_cost_per_hour],["Depreciación",machine.depreciation_cost_per_hour],["Otros",machine.additional_cost_per_hour]].map(([label,value]) => <div key={String(label)} className="rounded-xl border border-border bg-surface p-5"><p className="text-sm text-muted">{label}</p><p className="mt-2 text-xl font-bold">{formatCost(Number(value))}/h</p></div>)}</div>
    <div className="mb-8"><MachineCalculator costPerHour={Number(machine.total_cost_per_hour)} /></div>
    <MachineForm machine={machine} electricityPrice={Number(settings?.electricity_price_per_kwh ?? 0)} />
  </div>;
}
