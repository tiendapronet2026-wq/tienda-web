import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SupplierStatusButton } from "@/components/admin/CostForms";
import { formatDate } from "@/lib/utils";

type Props = { searchParams: Promise<{ q?: string; estado?: string; ubicacion?: string; material?: string }> };

export default async function SuppliersPage({ searchParams }: Props) {
  await requireAdmin();
  const { q, estado, ubicacion, material } = await searchParams;
  const supabase = await createClient();
  let query = supabase
    .from("suppliers")
    .select("*, supplier_materials(material_id)")
    .order("name");
  if (q?.trim()) query = query.or(`name.ilike.%${q.trim()}%,legal_name.ilike.%${q.trim()}%,contact_name.ilike.%${q.trim()}%`);
  if (estado === "activo") query = query.eq("is_active", true);
  if (estado === "inactivo") query = query.eq("is_active", false);
  if (ubicacion?.trim()) query = query.or(`city.ilike.%${ubicacion.trim()}%,province.ilike.%${ubicacion.trim()}%`);
  const [{ data: rawSuppliers }, { data: materials }] = await Promise.all([
    query,
    supabase.from("materials").select("id,name").order("name"),
  ]);
  const suppliers = (rawSuppliers ?? []).filter((supplier) =>
    !material ||
    (supplier.supplier_materials as { material_id: string }[]).some((item) => item.material_id === material),
  );

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><h1 className="text-3xl font-bold tracking-tight">Proveedores</h1><p className="mt-2 text-text-secondary">Contactos y condiciones de compra de materiales.</p></div>
        <div className="flex gap-2"><ButtonLink href="/admin/costos/exportar/proveedores" variant="outline">Exportar CSV</ButtonLink><ButtonLink href="/admin/proveedores/nuevo">Nuevo proveedor</ButtonLink></div>
      </div>
      <form className="mt-6 grid gap-3 rounded-[var(--radius-xl)] border border-border bg-surface p-4 sm:grid-cols-2 xl:grid-cols-4">
        <input aria-label="Buscar proveedor" name="q" defaultValue={q} placeholder="Buscar por nombre o contacto" className="rounded-lg border border-border px-3 py-2 text-sm" />
        <select aria-label="Estado del proveedor" name="estado" defaultValue={estado ?? ""} className="rounded-lg border border-border px-3 py-2 text-sm"><option value="">Todos los estados</option><option value="activo">Activos</option><option value="inactivo">Inactivos</option></select>
        <input aria-label="Ciudad o provincia" name="ubicacion" defaultValue={ubicacion} placeholder="Ciudad o provincia" className="rounded-lg border border-border px-3 py-2 text-sm" />
        <select aria-label="Material asociado" name="material" defaultValue={material ?? ""} className="rounded-lg border border-border px-3 py-2 text-sm"><option value="">Todos los materiales</option>{materials?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <button className="w-fit rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">Filtrar</button>
      </form>
      {!suppliers?.length ? <div className="mt-6"><EmptyState title="Sin proveedores" description="Creá el primer proveedor para asociarlo a materiales." actionHref="/admin/proveedores/nuevo" actionLabel="Nuevo proveedor" /></div> : (
        <div className="mt-6 overflow-x-auto rounded-[var(--radius-xl)] border border-border bg-surface shadow-[var(--shadow-sm)]">
          <table className="min-w-[900px] w-full text-left text-sm">
            <thead className="border-b border-border bg-background text-xs uppercase text-muted"><tr><th className="px-4 py-3">Nombre</th><th className="px-4 py-3">Contacto</th><th className="px-4 py-3">Materiales</th><th className="px-4 py-3">Entrega</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Actualizado</th><th className="px-4 py-3">Acciones</th></tr></thead>
            <tbody>{suppliers.map((supplier) => <tr key={supplier.id} className="border-b border-border/70 last:border-0">
              <td className="px-4 py-3"><Link href={`/admin/proveedores/${supplier.id}`} className="font-semibold text-brand hover:underline">{supplier.name}</Link><p className="text-xs text-muted">{supplier.city ?? ""} {supplier.province ?? ""}</p></td>
              <td className="px-4 py-3"><p>{supplier.contact_name ?? "—"}</p><p className="text-xs text-muted">{supplier.email ?? supplier.phone ?? "Sin datos"}</p></td>
              <td className="px-4 py-3">{(supplier.supplier_materials as { material_id: string }[])?.length ?? 0}</td>
              <td className="px-4 py-3">{supplier.lead_time_days == null ? "—" : `${supplier.lead_time_days} días`}</td>
              <td className="px-4 py-3"><Badge tone={supplier.is_active ? "active" : "inactive"}>{supplier.is_active ? "Activo" : "Inactivo"}</Badge></td>
              <td className="px-4 py-3">{formatDate(supplier.updated_at)}</td>
              <td className="px-4 py-3"><div className="flex items-center gap-2"><ButtonLink size="sm" variant="outline" href={`/admin/proveedores/${supplier.id}`}>Ver</ButtonLink><SupplierStatusButton id={supplier.id} isActive={supplier.is_active} /></div></td>
            </tr>)}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
