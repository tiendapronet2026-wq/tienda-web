import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { MaterialStatusButton } from "@/components/admin/CostForms";
import { formatCost, formatDate } from "@/lib/utils";

type Props = { searchParams: Promise<{ q?: string; categoria?: string; proveedor?: string; estado?: string; costo?: string; stock?: string }> };

export default async function MaterialsPage({ searchParams }: Props) {
  await requireAdmin();
  const filters = await searchParams;
  const supabase = await createClient();
  const [{ data: settings }, { data: categories }, { data: suppliers }, { data }] = await Promise.all([
    supabase.from("business_cost_settings").select("cost_stale_days").eq("is_active", true).single(),
    supabase.from("material_categories").select("id,name").eq("is_active", true).order("name"),
    supabase.from("suppliers").select("id,name").eq("is_active", true).order("name"),
    supabase.from("materials").select("*, material_categories(name), suppliers(name)").order("name").limit(500),
  ]);
  const staleBefore = Date.now() - (settings?.cost_stale_days ?? 30) * 86_400_000;
  const materials = (data ?? []).filter((item) => {
    if (filters.q && !`${item.name} ${item.sku ?? ""}`.toLowerCase().includes(filters.q.toLowerCase())) return false;
    if (filters.categoria && item.category_id !== filters.categoria) return false;
    if (filters.proveedor === "sin" && item.preferred_supplier_id) return false;
    if (filters.proveedor && filters.proveedor !== "sin" && item.preferred_supplier_id !== filters.proveedor) return false;
    if (filters.estado === "activo" && !item.is_active) return false;
    if (filters.estado === "inactivo" && item.is_active) return false;
    const stale = !item.last_cost_update || new Date(item.last_cost_update).getTime() < staleBefore;
    if (filters.costo === "desactualizado" && !stale) return false;
    if (filters.costo === "sin" && Number(item.current_cost) !== 0) return false;
    const low = item.stock_tracking_enabled && item.minimum_stock != null && Number(item.current_stock ?? 0) <= Number(item.minimum_stock);
    if (filters.stock === "bajo" && !low) return false;
    return true;
  });

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><h1 className="text-3xl font-bold tracking-tight">Materiales</h1><p className="mt-2 text-text-secondary">Costos, unidades, mermas, stock y proveedores.</p></div>
        <div className="flex gap-2"><ButtonLink href="/admin/costos/exportar/materiales" variant="outline">Exportar CSV</ButtonLink><ButtonLink href="/admin/materiales/nuevo">Nuevo material</ButtonLink></div>
      </div>
      <form className="mt-6 grid gap-3 rounded-[var(--radius-xl)] border border-border bg-surface p-4 sm:grid-cols-2 xl:grid-cols-6">
        <input aria-label="Buscar material" name="q" defaultValue={filters.q} placeholder="Nombre o SKU" className="rounded-lg border border-border px-3 py-2 text-sm" />
        <select aria-label="Categoría" name="categoria" defaultValue={filters.categoria ?? ""} className="rounded-lg border border-border px-3 py-2 text-sm"><option value="">Categorías</option>{categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select aria-label="Proveedor" name="proveedor" defaultValue={filters.proveedor ?? ""} className="rounded-lg border border-border px-3 py-2 text-sm"><option value="">Proveedores</option><option value="sin">Sin proveedor</option>{suppliers?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        <select aria-label="Estado" name="estado" defaultValue={filters.estado ?? ""} className="rounded-lg border border-border px-3 py-2 text-sm"><option value="">Estado</option><option value="activo">Activos</option><option value="inactivo">Inactivos</option></select>
        <select aria-label="Actualización de costo" name="costo" defaultValue={filters.costo ?? ""} className="rounded-lg border border-border px-3 py-2 text-sm"><option value="">Costo</option><option value="desactualizado">Desactualizado</option><option value="sin">Sin costo</option></select>
        <select aria-label="Estado de stock" name="stock" defaultValue={filters.stock ?? ""} className="rounded-lg border border-border px-3 py-2 text-sm"><option value="">Stock</option><option value="bajo">Bajo mínimo</option></select>
        <button className="w-fit rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">Filtrar</button>
      </form>
      {!materials.length ? <div className="mt-6"><EmptyState title="Sin materiales" description="No hay materiales que coincidan con los filtros." actionHref="/admin/materiales/nuevo" actionLabel="Nuevo material" /></div> : (
        <div className="mt-6 overflow-x-auto rounded-[var(--radius-xl)] border border-border bg-surface shadow-[var(--shadow-sm)]">
          <table className="min-w-[1150px] w-full text-left text-sm"><thead className="border-b border-border bg-background text-xs uppercase text-muted"><tr><th className="px-4 py-3">Material</th><th className="px-4 py-3">Unidad</th><th className="px-4 py-3">Costo</th><th className="px-4 py-3">Proveedor</th><th className="px-4 py-3">Merma / margen</th><th className="px-4 py-3">Actualizado</th><th className="px-4 py-3">Alertas</th><th className="px-4 py-3">Acciones</th></tr></thead>
            <tbody>{materials.map((material) => {
              const stale = !material.last_cost_update || new Date(material.last_cost_update).getTime() < staleBefore;
              const low = material.stock_tracking_enabled && material.minimum_stock != null && Number(material.current_stock ?? 0) <= Number(material.minimum_stock);
              return <tr key={material.id} className="border-b border-border/70 last:border-0">
                <td className="px-4 py-3"><Link href={`/admin/materiales/${material.id}`} className="font-semibold text-brand hover:underline">{material.name}</Link><p className="text-xs text-muted">{(material.material_categories as unknown as { name?: string } | null)?.name ?? "Sin categoría"} · {material.sku ?? "Sin SKU"}</p></td>
                <td className="px-4 py-3">{material.unit_type.replaceAll("_", " ")}</td><td className="px-4 py-3 font-semibold">{formatCost(Number(material.current_cost), material.currency)}</td>
                <td className="px-4 py-3">{(material.suppliers as unknown as { name?: string } | null)?.name ?? "—"}</td><td className="px-4 py-3">{material.waste_percentage}% / {material.suggested_margin_percentage}%</td><td className="px-4 py-3">{formatDate(material.last_cost_update)}</td>
                <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{Number(material.current_cost) === 0 && <Badge tone="soldout">Sin costo</Badge>}{stale && <Badge tone="beta">Desactualizado</Badge>}{!material.preferred_supplier_id && <Badge tone="inactive">Sin proveedor</Badge>}{low && <Badge tone="soldout">Bajo stock</Badge>}<Badge tone={material.is_active ? "active" : "inactive"}>{material.is_active ? "Activo" : "Inactivo"}</Badge></div></td>
                <td className="px-4 py-3"><div className="flex gap-2"><ButtonLink size="sm" variant="outline" href={`/admin/materiales/${material.id}`}>Ver</ButtonLink><MaterialStatusButton id={material.id} isActive={material.is_active} /></div></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
