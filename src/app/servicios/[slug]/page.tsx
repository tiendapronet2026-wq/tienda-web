import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/Button";
import { getServiceBySlug, platformServices } from "@/lib/platform/services";

export function generateStaticParams() {
  return platformServices.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) return { title: "Servicio" };
  return { title: service.title, description: service.shortDescription };
}

export default async function ServicioDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) notFound();

  return (
    <div className="tp-container py-12 sm:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Servicio</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{service.title}</h1>
      <p className="mt-4 max-w-2xl text-lg text-text-secondary">{service.description}</p>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {service.highlights.map((h) => (
          <li key={h} className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground">
            {h}
          </li>
        ))}
      </ul>
      <div className="mt-10 flex flex-wrap gap-3">
        <ButtonLink href="/demos">Ver demos relacionadas</ButtonLink>
        <ButtonLink href="/servicios" variant="outline">
          Todos los servicios
        </ButtonLink>
      </div>
    </div>
  );
}
