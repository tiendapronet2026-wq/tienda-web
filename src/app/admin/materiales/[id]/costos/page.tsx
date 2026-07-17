import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ButtonLink } from "@/components/ui/Button";
import { formatCost, formatDate } from "@/lib/utils";

export default async function MaterialCostsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: material }, { data: history }] = await Promise.all([
    supabase.from("materials").select("id,name,currency").eq("id", id).maybeSingle(),
    supabase.from("material_cost_history").select("*, suppliers(name)").eq("material_id", id).order("effective_date", { ascending: false }).order("created_at", { ascending: false }),
  ]);
  if (!material) notFound();
  const userIds = [...new Set((history ?? []).map((item) => item.created_by).filter(Boolean))];
  const { data: profiles } = userIds.length ? await supabase.from("profiles").select("id,first_name,last_name").in("id", userIds) : { data: [] };
  const names = new Map((profiles ?? []).map((p) => [p.id, `${p.first_name} ${p.last_name}`.trim()]));
  const chart = [...(history ?? [])].reverse();
  const max = Math.max(...chart.map((item) => Number(item.new_cost)), 1);
  const points = chart.map((item, index) => `${chart.length <= 1 ? 50 : (index / (chart.length - 1)) * 100},${100 - (Number(item.new_cost) / max) * 90}`).join(" ");
  return (
    <div>
      <Link href={`/admin/materiales/${id}`} className="text-sm text-brand hover:underline">← {material.name}</Link>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-3xl font-bold tracking-tight">Historial de costos</h1><p className="mt-2 text-text-secondary">{material.name} · registro inmutable desde la interfaz.</p></div><ButtonLink href="/admin/costos/exportar/historial" variant="outline">Exportar CSV</ButtonLink></div>
      {chart.length > 1 && <section className="mt-8 rounded-[var(--radius-xl)] border border-border bg-surface p-6 shadow-[var(--shadow-sm)]"><h2 className="text-lg font-semibold">Evolución</h2><div className="mt-4 h-48 w-full rounded-lg bg-background p-4"><svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full" role="img" aria-label="Evolución del costo"><polyline points={points} fill="none" stroke="var(--brand-primary)" strokeWidth="2" vectorEffect="non-scaling-stroke" /></svg></div></section>}
      {!history?.length ? <p className="mt-8 rounded-xl border border-dashed border-border p-8 text-center text-muted">Todavía no hay cambios de costo.</p> : <div className="mt-8 overflow-x-auto rounded-[var(--radius-xl)] border border-border bg-surface shadow-[var(--shadow-sm)]"><table className="min-w-[950px] w-full text-left text-sm"><thead className="border-b border-border bg-background text-xs uppercase text-muted"><tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Proveedor</th><th className="px-4 py-3">Anterior</th><th className="px-4 py-3">Nuevo</th><th className="px-4 py-3">Diferencia</th><th className="px-4 py-3">Variación</th><th className="px-4 py-3">Referencia</th><th className="px-4 py-3">Usuario</th></tr></thead><tbody>{history.map((item) => {
        const previous = item.previous_cost == null ? null : Number(item.previous_cost);
        const current = Number(item.new_cost);
        const difference = previous == null ? null : current - previous;
        const variation = previous && previous !== 0 ? (difference! / previous) * 100 : null;
        return <tr key={item.id} className="border-b border-border/70 last:border-0"><td className="px-4 py-3">{formatDate(item.effective_date)}</td><td className="px-4 py-3">{(item.suppliers as unknown as { name?: string } | null)?.name ?? "—"}</td><td className="px-4 py-3">{previous == null ? "—" : formatCost(previous, item.currency)}</td><td className="px-4 py-3 font-semibold">{formatCost(current, item.currency)}</td><td className="px-4 py-3">{difference == null ? "—" : formatCost(difference, item.currency)}</td><td className="px-4 py-3">{variation == null ? "—" : `${variation.toFixed(2)}%`}</td><td className="px-4 py-3">{item.reference ?? "—"}</td><td className="px-4 py-3">{names.get(item.created_by) ?? "Admin"}</td></tr>;
      })}</tbody></table></div>}
    </div>
  );
}
