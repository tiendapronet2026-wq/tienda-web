import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { MachineForm } from "@/components/admin/CostForms";

export default async function NewMachinePage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: settings } = await supabase.from("business_cost_settings").select("electricity_price_per_kwh").eq("is_active", true).single();
  return <div className="max-w-5xl"><Link href="/admin/maquinas" className="text-sm text-brand hover:underline">← Máquinas</Link><h1 className="mt-4 text-3xl font-bold tracking-tight">Nueva máquina</h1><p className="mt-2 mb-8 text-text-secondary">No se aplican costos automáticos si faltan datos o el precio de electricidad.</p><MachineForm electricityPrice={Number(settings?.electricity_price_per_kwh ?? 0)} /></div>;
}
