import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCost } from "@/lib/utils";

const labels: Record<string, string> = { printer_paper: "Impresora papel", printer_3d: "Impresora 3D", laser_engraver: "Grabadora láser", polifan_cutter: "Cortadora polifan", computer: "Computadora", finishing_tool: "Terminación", other: "Otra" };

export default async function MachinesPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: machines } = await supabase.from("machines").select("*").order("name");
  return <div>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-3xl font-bold tracking-tight">Máquinas y equipos</h1><p className="mt-2 text-text-secondary">Desglose de energía, mantenimiento, depreciación y otros costos.</p></div><div className="flex gap-2"><ButtonLink href="/admin/costos/exportar/maquinas" variant="outline">Exportar CSV</ButtonLink><ButtonLink href="/admin/maquinas/nueva">Nueva máquina</ButtonLink></div></div>
    {!machines?.length ? <div className="mt-8"><EmptyState title="Sin máquinas" description="Agregá equipos reales para calcular su costo operativo." actionHref="/admin/maquinas/nueva" actionLabel="Nueva máquina" /></div> : <div className="mt-8 overflow-x-auto rounded-[var(--radius-xl)] border border-border bg-surface shadow-[var(--shadow-sm)]"><table className="min-w-[1100px] w-full text-left text-sm"><thead className="border-b border-border bg-background text-xs uppercase text-muted"><tr><th className="px-4 py-3">Máquina</th><th className="px-4 py-3">Potencia</th><th className="px-4 py-3">Energía/h</th><th className="px-4 py-3">Mantenimiento/h</th><th className="px-4 py-3">Depreciación/h</th><th className="px-4 py-3">Total/h</th><th className="px-4 py-3">Estado</th></tr></thead><tbody>{machines.map((m) => <tr key={m.id} className="border-b border-border/70 last:border-0"><td className="px-4 py-3"><Link href={`/admin/maquinas/${m.id}`} className="font-semibold text-brand hover:underline">{m.name}</Link><p className="text-xs text-muted">{labels[m.machine_type] ?? m.machine_type} · {[m.brand,m.model].filter(Boolean).join(" ") || "Sin marca/modelo"}</p></td><td className="px-4 py-3">{m.power_watts == null ? "—" : `${m.power_watts} W`}</td><td className="px-4 py-3">{formatCost(Number(m.energy_cost_per_hour))}</td><td className="px-4 py-3">{formatCost(Number(m.maintenance_cost_per_hour))}</td><td className="px-4 py-3">{formatCost(Number(m.depreciation_cost_per_hour))}</td><td className="px-4 py-3 font-bold">{formatCost(Number(m.total_cost_per_hour))}</td><td className="px-4 py-3"><div className="flex gap-2"><Badge tone={m.is_active ? "active" : "inactive"}>{m.is_active ? "Activa" : "Inactiva"}</Badge>{Number(m.total_cost_per_hour) === 0 && <Badge tone="soldout">Sin costo</Badge>}</div></td></tr>)}</tbody></table></div>}
  </div>;
}
