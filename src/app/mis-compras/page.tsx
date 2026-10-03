import Link from "next/link";
import { DigitalEntitlementAccessButton } from "@/components/digital/DigitalEntitlementAccessButton";
import { requireAuth } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function MisComprasPage() {
  const user = await requireAuth("/login?redirect=/mis-compras");
  const supabase = await createClient();

  const { data: entitlements } = await supabase
    .from("digital_entitlements")
    .select("id, status, product_id, granted_at, products(name)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("granted_at", { ascending: false });

  return (
    <div className="tp-container py-10 sm:py-12">
      <h1 className="text-3xl font-bold">Mis compras digitales</h1>
      <p className="mt-2 text-muted">Accedé al contenido de los packs que compraste con esta cuenta.</p>

      {!entitlements?.length ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted">
          <p>Todavía no tenés accesos digitales activos.</p>
          <Link href="/oferta/pack-150" className="mt-4 inline-block font-semibold text-brand">
            Ver Pack +150 Cursos
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {entitlements.map((row) => {
            const name =
              row.products && typeof row.products === "object" && "name" in row.products
                ? String((row.products as { name: string }).name)
                : "Producto digital";
            return (
              <DigitalEntitlementAccessButton key={row.id} entitlementId={row.id} productName={name} />
            );
          })}
        </div>
      )}
    </div>
  );
}
