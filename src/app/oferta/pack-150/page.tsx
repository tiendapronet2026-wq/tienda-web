import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/AddToCartButton";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PACK_150_PRODUCT_SLUG } from "@/lib/digital/constants";
import { isSalesTrackingSrc } from "@/lib/sales/channels";
import {
  SALES_ATTRIBUTION_COOKIE_CID,
  SALES_ATTRIBUTION_COOKIE_SRC,
  touchSalesAttribution,
} from "@/lib/sales/attribution";
import { formatPrice } from "@/lib/utils";

const FAQ = [
  {
    q: "¿Qué recibo exactamente?",
    a: "Acceso digital al pack con más de 150 cursos y bonos comerciales. No hay envío físico.",
  },
  {
    q: "¿Cómo accedo después de pagar?",
    a: "Cuando el pago se aprueba, activamos tu acceso en Mis compras dentro de Tienda Pro.",
  },
  {
    q: "¿Puedo revender el material?",
    a: "Comercializás según los derechos que adquirís con tu compra. No prometemos ingresos ni resultados garantizados.",
  },
  {
    q: "¿Necesito cuenta?",
    a: "Sí, el checkout usa tu cuenta para asociar el acceso digital de forma segura.",
  },
];

export default async function Pack150OfferPage({
  searchParams,
}: {
  searchParams: Promise<{ src?: string; cid?: string }>;
}) {
  const sp = await searchParams;
  const admin = createAdminClient();

  if (isSalesTrackingSrc(sp.src) && sp.cid?.trim()) {
    const cookieStore = await cookies();
    const cookieOpts = {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 14,
      path: "/",
    };
    cookieStore.set(SALES_ATTRIBUTION_COOKIE_CID, sp.cid.trim(), cookieOpts);
    cookieStore.set(SALES_ATTRIBUTION_COOKIE_SRC, sp.src, cookieOpts);
  }

  await touchSalesAttribution(admin, { src: sp.src ?? null, cid: sp.cid ?? null });

  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("id, name, slug, description, short_description, price, is_active, fulfillment_type")
    .eq("slug", PACK_150_PRODUCT_SLUG)
    .maybeSingle();

  if (!product || !product.is_active) notFound();

  const priceLabel = formatPrice(Number(product.price));

  return (
    <div className="tp-container py-10 sm:py-14">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">Oferta digital</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{product.name}</h1>
        <p className="mt-4 text-lg text-muted">
          {product.short_description ??
            "Formación variada y bonos para estudiar y comercializar tu pack digital."}
        </p>
        <p className="mt-6 text-3xl font-bold text-foreground">{priceLabel}</p>
        <p className="mt-1 text-sm text-muted">Precio actual en Tienda Pro (configurable desde administración)</p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <AddToCartButton productId={product.id} disabled={false} />
          <Link
            href={`/productos/${product.slug}`}
            className="text-sm font-semibold text-brand underline-offset-4 hover:underline"
          >
            Ver ficha en catálogo
          </Link>
        </div>
      </div>

      <section className="mx-auto mt-14 max-w-3xl space-y-6">
        <h2 className="text-xl font-bold">Qué incluye</h2>
        <ul className="list-disc space-y-2 pl-5 text-text-secondary">
          <li>Más de 150 cursos digitales en distintas áreas (marketing, diseño, idiomas, tecnología, oficios y más).</li>
          <li>Bonos de material comercial y guías de apoyo según el pack.</li>
          <li>Acceso online tras confirmar el pago (sin envío físico).</li>
        </ul>
        {product.description && (
          <p className="text-sm leading-relaxed text-text-secondary">{product.description}</p>
        )}
      </section>

      <section className="mx-auto mt-12 max-w-3xl">
        <h2 className="text-xl font-bold">Preguntas frecuentes</h2>
        <dl className="mt-6 space-y-6">
          {FAQ.map((item) => (
            <div key={item.q}>
              <dt className="font-semibold">{item.q}</dt>
              <dd className="mt-1 text-sm text-text-secondary">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mx-auto mt-12 max-w-3xl rounded-2xl border border-border bg-surface-muted p-6 text-sm text-text-secondary">
        <p>
          Soporte postcompra: si tenés problemas con el acceso, contactanos desde la web con el número de pedido.
          Este asistente y la tienda no garantizan resultados económicos.
        </p>
      </section>
    </div>
  );
}
