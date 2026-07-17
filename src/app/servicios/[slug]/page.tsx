import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/Button";
import { ServiceIcon } from "@/components/services/ServiceIcon";
import { getServiceBySlug, MAIN_SERVICES } from "@/lib/services";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return MAIN_SERVICES.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) return { title: "Servicio" };
  return {
    title: service.title,
    description: service.description,
  };
}

export default async function ServiceDetailPage({ params }: Props) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) notFound();

  return (
    <div>
      <section className="border-b border-border bg-surface">
        <div className="tp-container py-10 sm:py-14">
          <nav className="text-sm text-text-secondary" aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <Link href="/" className="hover:text-brand">
                  Inicio
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li>
                <Link href="/servicios" className="hover:text-brand">
                  Servicios
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li className="font-medium text-foreground">{service.shortTitle}</li>
            </ol>
          </nav>

          <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${service.iconBg}`}>
                <ServiceIcon slug={service.slug} className="h-6 w-6" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Servicio</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {service.title}
              </h1>
              <p className="mt-3 text-base leading-relaxed text-text-secondary sm:text-lg">
                {service.description}
              </p>
            </div>
            <ButtonLink href={`/cotizacion?servicio=${service.slug}`} size="lg">
              Solicitar cotización
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className="tp-container grid gap-6 py-12 sm:py-16 lg:grid-cols-2">
        <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-6 shadow-[var(--shadow-sm)]">
          <h2 className="text-lg font-semibold text-foreground">Aplicaciones frecuentes</h2>
          <ul className="mt-4 space-y-2.5 text-sm text-text-secondary">
            {service.examples.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-brand" aria-hidden>
                  ✓
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-6 shadow-[var(--shadow-sm)]">
          <h2 className="text-lg font-semibold text-foreground">Información útil para cotizar</h2>
          <ul className="mt-4 space-y-2.5 text-sm text-text-secondary">
            {service.needed.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-brand-secondary" aria-hidden>
                  •
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted">
            Si no tenés todos los datos, igual podés enviar la solicitud con lo que sepas.
          </p>
        </div>
      </section>

      <section className="border-y border-border bg-background">
        <div className="tp-container py-12 sm:py-16">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Proceso de trabajo</h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {service.process.map((step, index) => (
              <li
                key={step}
                className="rounded-[var(--radius-xl)] border border-border bg-surface p-5 shadow-[var(--shadow-sm)]"
              >
                <p className="text-xs font-bold uppercase tracking-wider text-brand">Paso {index + 1}</p>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="tp-container py-12 sm:py-16">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Preguntas frecuentes</h2>
        <div className="mt-6 space-y-4">
          {service.faqs.map((faq) => (
            <details
              key={faq.q}
              className="rounded-[var(--radius-xl)] border border-border bg-surface p-5 shadow-[var(--shadow-sm)]"
            >
              <summary className="cursor-pointer font-semibold text-foreground">{faq.q}</summary>
              <p className="mt-3 text-sm leading-relaxed text-text-secondary">{faq.a}</p>
            </details>
          ))}
        </div>

        <div className="mt-10 rounded-[1.5rem] border border-border bg-background-dark px-6 py-10 text-white sm:px-10">
          <h2 className="text-2xl font-bold tracking-tight">¿Listo para cotizar este servicio?</h2>
          <p className="mt-3 max-w-2xl text-white/70">
            Completá el formulario con los detalles de tu proyecto y adjuntá archivos si los tenés.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href={`/cotizacion?servicio=${service.slug}`} size="lg">
              Solicitar cotización
            </ButtonLink>
            <ButtonLink
              href="/servicios"
              size="lg"
              variant="outline"
              className="border-white/25 bg-white/5 text-white hover:border-white/40 hover:bg-white/10 hover:text-white"
            >
              Ver todos los servicios
            </ButtonLink>
          </div>
        </div>
      </section>
    </div>
  );
}
