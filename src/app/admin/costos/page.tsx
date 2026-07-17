import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ButtonLink } from "@/components/ui/Button";
import { formatCost, formatDate } from "@/lib/utils";

export default async function CostsDashboardPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("business_cost_settings")
    .select("*")
    .eq("is_active", true)
    .single();
  const staleDays = settings?.cost_stale_days ?? 30;
  const staleBefore = new Date(Date.now() - staleDays * 86_400_000).toISOString();

  const [
    suppliers,
    materials,
    stale,
    noSupplier,
    noCost,
    lowStock,
    machines,
    machinesNoCost,
    recent,
  ] = await Promise.all([
    supabase.from("suppliers").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("materials").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("materials").select("id", { count: "exact", head: true }).eq("is_active", true).or(`last_cost_update.is.null,last_cost_update.lt.${staleBefore}`),
    supabase.from("materials").select("id", { count: "exact", head: true }).eq("is_active", true).is("preferred_supplier_id", null),
    supabase.from("materials").select("id", { count: "exact", head: true }).eq("is_active", true).eq("current_cost", 0),
    supabase.from("materials").select("current_stock,minimum_stock").eq("stock_tracking_enabled", true).not("minimum_stock", "is", null),
    supabase.from("machines").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("machines").select("id", { count: "exact", head: true }).eq("is_active", true).eq("total_cost_per_hour", 0),
    supabase.from("material_cost_history").select("id,new_cost,currency,effective_date,materials(name),suppliers(name)").order("effective_date", { ascending: false }).limit(8),
  ]);

  const stats = [
    ["Proveedores activos", suppliers.count ?? 0, "/admin/proveedores"],
    ["Materiales activos", materials.count ?? 0, "/admin/materiales"],
    ["Costos desactualizados", stale.count ?? 0, "/admin/materiales?costo=desactualizado"],
    ["Materiales sin proveedor", noSupplier.count ?? 0, "/admin/materiales?proveedor=sin"],
    ["Materiales sin costo", noCost.count ?? 0, "/admin/materiales?costo=sin"],
    ["Bajo stock mínimo", (lowStock.data ?? []).filter((item) => Number(item.current_stock ?? 0) <= Number(item.minimum_stock)).length, "/admin/materiales?stock=bajo"],
    ["Máquinas activas", machines.count ?? 0, "/admin/maquinas"],
    ["Máquinas sin costo/h", machinesNoCost.count ?? 0, "/admin/maquinas"],
  ] as const;

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Costos y producción</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Dashboard de costos</h1>
          <p className="mt-2 text-text-secondary">Base interna para conocer costos reales y preparar futuros cotizadores.</p>
        </div>
        <ButtonLink href="/admin/configuracion/costos" variant="outline">Configuración</ButtonLink>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(([label, value, href]) => (
          <Link key={label} href={href} className="rounded-[var(--radius-xl)] border border-border bg-surface p-5 shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]">
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
          </Link>
        ))}
      </div>

      <section className="mt-8 rounded-[var(--radius-xl)] border border-border bg-surface p-6 shadow-[var(--shadow-sm)]">
        <h2 className="text-lg font-semibold">Accesos rápidos</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <ButtonLink href="/admin/proveedores/nuevo" size="sm">Nuevo proveedor</ButtonLink>
          <ButtonLink href="/admin/materiales/nuevo" size="sm">Nuevo material</ButtonLink>
          <ButtonLink href="/admin/materiales" size="sm" variant="outline">Actualizar costos</ButtonLink>
          <ButtonLink href="/admin/maquinas/nueva" size="sm" variant="outline">Nueva máquina</ButtonLink>
          <ButtonLink href="/admin/configuracion/costos" size="sm" variant="outline">Configurar electricidad</ButtonLink>
          <ButtonLink href="/admin/mano-de-obra" size="sm" variant="outline">Configurar mano de obra</ButtonLink>
        </div>
        {(settings?.electricity_price_per_kwh ?? 0) <= 0 && (
          <p className="mt-4 rounded-lg bg-warning-soft px-4 py-3 text-sm text-warning">
            El precio de electricidad no está configurado. Los cálculos automáticos de energía permanecerán en cero.
          </p>
        )}
      </section>

      <section className="mt-8 rounded-[var(--radius-xl)] border border-border bg-surface p-6 shadow-[var(--shadow-sm)]">
        <h2 className="text-lg font-semibold">Últimas actualizaciones de costos</h2>
        {!recent.data?.length ? (
          <p className="mt-4 text-sm text-muted">Todavía no hay actualizaciones registradas.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase text-muted">
                <tr><th className="py-3 pr-4">Fecha</th><th className="px-4 py-3">Material</th><th className="px-4 py-3">Proveedor</th><th className="pl-4 py-3 text-right">Costo</th></tr>
              </thead>
              <tbody>
                {recent.data.map((item) => (
                  <tr key={item.id} className="border-b border-border/70 last:border-0">
                    <td className="py-3 pr-4">{formatDate(item.effective_date)}</td>
                    <td className="px-4 py-3 font-medium">{(item.materials as unknown as { name?: string })?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted">{(item.suppliers as unknown as { name?: string } | null)?.name ?? "—"}</td>
                    <td className="py-3 pl-4 text-right font-semibold">{formatCost(Number(item.new_cost), item.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
