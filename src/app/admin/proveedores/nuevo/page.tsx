import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { SupplierForm } from "@/components/admin/CostForms";

export default async function NewSupplierPage() {
  await requireAdmin();
  return (
    <div className="max-w-4xl">
      <Link href="/admin/proveedores" className="text-sm text-brand hover:underline">← Proveedores</Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight">Nuevo proveedor</h1>
      <p className="mt-2 mb-8 text-text-secondary">Guardá solo la información que conozcas; los datos fiscales son opcionales.</p>
      <SupplierForm />
    </div>
  );
}
