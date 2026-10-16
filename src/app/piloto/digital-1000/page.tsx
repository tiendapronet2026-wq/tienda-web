import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/AddToCartButton";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  PILOT_DIGITAL_1000_PATH,
  PILOT_DIGITAL_1000_PRICE_ARS,
  PILOT_DIGITAL_1000_SKU,
  PILOT_DIGITAL_1000_SLUG,
} from "@/lib/digital/constants";
import { isPilotDigital1000Enabled } from "@/lib/digital/pilot-digital-1000";
import { formatPrice } from "@/lib/utils";

export default async function PilotDigital1000Page() {
  if (!isPilotDigital1000Enabled()) {
    notFound();
  }

  const admin = createAdminClient();
  const { data: product } = await admin
    .from("products")
    .select("id, name, slug, sku, price, is_active, fulfillment_type, short_description")
    .eq("slug", PILOT_DIGITAL_1000_SLUG)
    .maybeSingle();

  if (
    !product ||
    product.sku !== PILOT_DIGITAL_1000_SKU ||
    !product.is_active ||
    product.fulfillment_type !== "digital"
  ) {
    notFound();
  }

  const price = Number(product.price);
  if (Math.round(price * 100) !== Math.round(PILOT_DIGITAL_1000_PRICE_ARS * 100)) {
    notFound();
  }

  return (
    <div className="tp-container py-10 sm:py-14">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">Compra piloto</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight">{product.name}</h1>
        <p className="mt-4 text-muted">
          {product.short_description ??
            "Prueba controlada de checkout Mercado Pago y entrega digital. No es el Pack +150."}
        </p>
        <p className="mt-6 text-3xl font-bold">{formatPrice(price)}</p>
        <p className="mt-1 text-sm text-muted">SKU {PILOT_DIGITAL_1000_SKU} · precio fijado en servidor</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <AddToCartButton productId={product.id} disabled={false} />
          <Link href="/carrito" className="text-sm font-semibold text-brand underline-offset-4 hover:underline">
            Ir al carrito
          </Link>
        </div>
        <ul className="mt-10 list-disc space-y-2 pl-5 text-sm text-text-secondary">
          <li>Requiere iniciar sesión para pagar.</li>
          <li>El pago se procesa en Mercado Pago; la entrega ocurre solo tras acreditación.</li>
          <li>Esta URL no aparece en el catálogo público.</li>
        </ul>
        <p className="mt-8 font-mono text-xs text-muted">{PILOT_DIGITAL_1000_PATH}</p>
      </div>
    </div>
  );
}
