import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";

export default async function AdminCustomersPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: customers } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "customer")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-3xl font-bold">Clientes</h1>
      <p className="mt-2 text-zinc-500">Usuarios registrados en la tienda.</p>

      <div className="mt-8 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-100 bg-zinc-50">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Teléfono</th>
              <th className="px-4 py-3">Documento</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Registro</th>
            </tr>
          </thead>
          <tbody>
            {customers?.map((customer) => (
              <tr key={customer.id} className="border-b border-zinc-50">
                <td className="px-4 py-3 font-medium">
                  {customer.first_name} {customer.last_name}
                </td>
                <td className="px-4 py-3 text-zinc-500">{customer.phone ?? "—"}</td>
                <td className="px-4 py-3 text-zinc-500">{customer.document_number ?? "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      customer.status === "active"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {customer.status === "active" ? "Activo" : "Suspendido"}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {new Date(customer.created_at).toLocaleDateString("es-AR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!customers?.length && (
          <p className="p-8 text-center text-zinc-500">Todavía no hay clientes registrados.</p>
        )}
      </div>
    </div>
  );
}
