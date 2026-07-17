import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { LaborManager, LaborRateEditor } from "@/components/admin/CostForms";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCost, formatDate } from "@/lib/utils";

export default async function LaborPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: rates } = await supabase.from("labor_rates").select("*").order("name");
  return <div><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-3xl font-bold tracking-tight">Mano de obra</h1><p className="mt-2 text-text-secondary">Conceptos internos; no constituyen nómina ni liquidación laboral.</p></div><ButtonLink href="/admin/costos/exportar/mano-de-obra" variant="outline">Exportar CSV</ButtonLink></div>
    <div className="mt-8"><LaborManager rates={rates ?? []} /></div>
    <section className="mt-8"><h2 className="text-xl font-semibold">Conceptos configurados</h2>{!rates?.length ? <div className="mt-4"><EmptyState title="Sin conceptos" description="Creá costos para diseño, preparación, operación o terminación." /></div> : <div className="mt-4 space-y-4">{rates.map((rate) => <div key={rate.id}><div className="mb-2 flex flex-wrap gap-3 text-xs text-muted"><span>Costo: {formatCost(Number(rate.cost_per_hour), rate.currency)}/h</span><span>Sugerido: {rate.suggested_sale_rate_per_hour == null ? "—" : `${formatCost(Number(rate.suggested_sale_rate_per_hour), rate.currency)}/h`}</span><span>Actualizado: {formatDate(rate.updated_at)}</span></div><LaborRateEditor rate={rate} /></div>)}</div>}</section>
  </div>;
}
