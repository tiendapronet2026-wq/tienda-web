import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { MaterialCostForm, MaterialForm, MaterialStatusButton, SupplierMaterialForm } from "@/components/admin/CostForms";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { formatCost } from "@/lib/utils";

export default async function MaterialDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: material }, { data: categories }, { data: suppliers }, { data: links }] = await Promise.all([
    supabase.from("materials").select("*").eq("id", id).maybeSingle(),
    supabase.from("material_categories").select("id,name").eq("is_active", true).order("name"),
    supabase.from("suppliers").select("id,name").eq("is_active", true).order("name"),
    supabase.from("supplier_materials").select("*, suppliers(name)").eq("material_id", id).order("is_preferred", { ascending: false }),
  ]);
  if (!material) notFound();
  return (
    <div className="max-w-6xl">
      <Link href="/admin/materiales" className="text-sm text-brand hover:underline">← Materiales</Link>
      <div className="mt-4 mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div><div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl font-bold tracking-tight">{material.name}</h1><Badge tone={material.is_active ? "active" : "inactive"}>{material.is_active ? "Activo" : "Inactivo"}</Badge></div><p className="mt-2 text-text-secondary">Costo actual: <strong>{formatCost(Number(material.current_cost), material.currency)}</strong></p></div>
        <div className="flex gap-2"><ButtonLink href={`/admin/materiales/${id}/costos`} variant="outline">Historial</ButtonLink><MaterialStatusButton id={id} isActive={material.is_active} /></div>
      </div>
      <MaterialForm material={material} categories={categories ?? []} suppliers={suppliers ?? []} />
      <div className="mt-8 grid gap-5 xl:grid-cols-2"><MaterialCostForm materialId={id} currency={material.currency} suppliers={suppliers ?? []} /><SupplierMaterialForm materialId={id} suppliers={suppliers ?? []} /></div>
      <section className="mt-8 rounded-[var(--radius-xl)] border border-border bg-surface p-6 shadow-[var(--shadow-sm)]">
        <h2 className="text-lg font-semibold">Proveedores asociados</h2>
        {!links?.length ? <p className="mt-3 text-sm text-muted">No hay proveedores asociados.</p> : <div className="mt-4 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-border text-xs uppercase text-muted"><tr><th className="py-3">Proveedor</th><th className="px-4 py-3">Unidad</th><th className="px-4 py-3">Conversión</th><th className="px-4 py-3">Precio</th><th className="px-4 py-3">Preferido</th></tr></thead><tbody>{links.map((item) => <tr key={item.id} className="border-b border-border/70 last:border-0"><td className="py-3">{(item.suppliers as unknown as { name: string }).name}</td><td className="px-4 py-3">{item.purchase_unit ?? "—"}</td><td className="px-4 py-3">{item.unit_conversion_factor}</td><td className="px-4 py-3">{item.latest_purchase_price == null ? "—" : formatCost(Number(item.latest_purchase_price), item.currency)}</td><td className="px-4 py-3">{item.is_preferred ? "Sí" : "No"}</td></tr>)}</tbody></table></div>}
      </section>
    </div>
  );
}
