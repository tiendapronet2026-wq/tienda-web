import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/admin/CostForms";

export default async function CostSettingsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: settings } = await supabase.from("business_cost_settings").select("*").eq("is_active", true).single();
  if (!settings) return <p className="text-error">No se encontró la configuración activa.</p>;
  return <div><h1 className="text-3xl font-bold tracking-tight">Configuración de costos</h1><p className="mt-2 mb-8 max-w-3xl text-text-secondary">Estos valores preparan cálculos internos futuros. No modifican catálogo, productos ni cotizaciones recibidas.</p><SettingsForm settings={settings} /></div>;
}
