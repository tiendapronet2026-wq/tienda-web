import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { MaterialForm } from "@/components/admin/CostForms";

export default async function NewMaterialPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: categories }, { data: suppliers }] = await Promise.all([
    supabase.from("material_categories").select("id,name").eq("is_active", true).order("name"),
    supabase.from("suppliers").select("id,name").eq("is_active", true).order("name"),
  ]);
  return <div className="max-w-5xl"><Link href="/admin/materiales" className="text-sm text-brand hover:underline">← Materiales</Link><h1 className="mt-4 text-3xl font-bold tracking-tight">Nuevo material</h1><p className="mt-2 mb-8 text-text-secondary">Definí la unidad consumida; el costo inicial quedará registrado en el historial.</p><MaterialForm categories={categories ?? []} suppliers={suppliers ?? []} /></div>;
}
