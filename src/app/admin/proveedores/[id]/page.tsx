import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { SupplierForm, SupplierStatusButton } from "@/components/admin/CostForms";
import { Badge } from "@/components/ui/Badge";
import { formatCost } from "@/lib/utils";

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: supplier }, { data: associations }] = await Promise.all([
    supabase.from("suppliers").select("*").eq("id", id).maybeSingle(),
    supabase.from("supplier_materials").select("*, materials(id,name,unit_type)").eq("supplier_id", id).order("updated_at", { ascending: false }),
  ]);
  if (!supplier) notFound();
  return (
    <div className="max-w-5xl">
      <Link href="/admin/proveedores" className="text-sm text-brand hover:underline">← Proveedores</Link>
      <div className="mt-4 mb-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div><div className="flex items-center gap-3"><h1 className="text-3xl font-bold tracking-tight">{supplier.name}</h1><Badge tone={supplier.is_active ? "active" : "inactive"}>{supplier.is_active ? "Activo" : "Inactivo"}</Badge></div><p className="mt-2 text-text-secondary">Editá sus datos y revisá materiales suministrados.</p></div>
        <SupplierStatusButton id={supplier.id} isActive={supplier.is_active} />
      </div>
      <SupplierForm supplier={supplier} />
      <section className="mt-8 rounded-[var(--radius-xl)] border border-border bg-surface p-6 shadow-[var(--shadow-sm)]">
        <h2 className="text-lg font-semibold">Materiales suministrados</h2>
        {!associations?.length ? <p className="mt-3 text-sm text-muted">No tiene materiales asociados.</p> : <div className="mt-4 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-border text-xs uppercase text-muted"><tr><th className="py-3">Material</th><th className="px-4 py-3">SKU proveedor</th><th className="px-4 py-3">Último precio</th><th className="px-4 py-3">Preferido</th></tr></thead><tbody>{associations.map((item) => <tr key={item.id} className="border-b border-border/70 last:border-0"><td className="py-3"><Link href={`/admin/materiales/${(item.materials as unknown as { id: string }).id}`} className="font-medium text-brand">{(item.materials as unknown as { name: string }).name}</Link></td><td className="px-4 py-3">{item.supplier_sku ?? "—"}</td><td className="px-4 py-3">{item.latest_purchase_price == null ? "—" : formatCost(Number(item.latest_purchase_price), item.currency)}</td><td className="px-4 py-3">{item.is_preferred ? "Sí" : "No"}</td></tr>)}</tbody></table></div>}
      </section>
    </div>
  );
}
