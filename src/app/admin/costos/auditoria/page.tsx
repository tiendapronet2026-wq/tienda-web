import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils";

export default async function CostAuditPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase.from("cost_audit_log").select("*").order("created_at", { ascending: false }).limit(200);
  return <div><h1 className="text-3xl font-bold tracking-tight">Auditoría de costos</h1><p className="mt-2 text-text-secondary">Cambios relevantes en costos, proveedores, máquinas y configuración.</p>
    {!data?.length ? <div className="mt-8"><EmptyState title="Sin eventos" description="Los cambios importantes se registrarán acá." /></div> : <div className="mt-8 overflow-x-auto rounded-[var(--radius-xl)] border border-border bg-surface"><table className="min-w-[900px] w-full text-left text-sm"><thead className="border-b border-border bg-background text-xs uppercase text-muted"><tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Entidad</th><th className="px-4 py-3">Acción</th><th className="px-4 py-3">ID</th><th className="px-4 py-3">Cambios</th></tr></thead><tbody>{data.map((item) => <tr key={item.id} className="border-b border-border/70 last:border-0"><td className="px-4 py-3">{formatDate(item.created_at)}</td><td className="px-4 py-3">{item.entity_type}</td><td className="px-4 py-3 font-medium">{item.action}</td><td className="px-4 py-3 font-mono text-xs">{item.entity_id}</td><td className="px-4 py-3"><details><summary className="cursor-pointer text-brand">Ver datos</summary><pre className="mt-2 max-w-xl overflow-auto rounded bg-background p-3 text-xs">{JSON.stringify({ antes: item.old_values, después: item.new_values }, null, 2)}</pre></details></td></tr>)}</tbody></table></div>}
  </div>;
}
