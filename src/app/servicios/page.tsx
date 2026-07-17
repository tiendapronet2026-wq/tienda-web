import Link from "next/link";
import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { ServiceIcon } from "@/components/services/ServiceIcon";
import { MAIN_SERVICES } from "@/lib/services";

export const metadata: Metadata = {
  title: "Servicios",
  description:
    "Impresiones en papel, impresión 3D, grabado láser y corte de polifan. Solicitá una cotización personalizada.",
};

export default function ServicesPage() {
  return (
    <div>
      <section className="border-b border-border bg-surface">
        <div className="tp-container py-12 sm:py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Servicios</p>
          <h1 className="mt-2 max-w-3xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Soluciones para transformar tus ideas
          </h1>
          <p className="mt-3 max-w-2xl text-base text-text-secondary sm:text-lg">
            Elegí el servicio que mejor se adapta a tu proyecto y solicitá una cotización personalizada.
          </p>
          <div className="mt-7">
            <ButtonLink href="/cotizacion" size="lg">
              Solicitar cotización
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className="tp-container py-12 sm:py-16">
        <div className="grid gap-5 lg:grid-cols-2">
          {MAIN_SERVICES.map((service) => (
            <article
              key={service.slug}
              className="flex h-full flex-col rounded-[var(--radius-xl)] border border-border bg-surface p-6 shadow-[var(--shadow-sm)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] sm:p-7"
            >
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${service.iconBg}`}>
                <ServiceIcon slug={service.slug} className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">{service.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">{service.description}</p>
              <ul className="mt-4 space-y-1.5 text-sm text-text-secondary">
                {service.examples.map((example) => (
                  <li key={example} className="flex gap-2">
                    <span className="text-brand" aria-hidden>
                      •
                    </span>
                    <span>{example}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href={`/servicios/${service.slug}`} variant="outline" className="w-full sm:w-auto">
                  Ver servicio
                </ButtonLink>
                <ButtonLink
                  href={`/cotizacion?servicio=${service.slug}`}
                  className="w-full sm:w-auto"
                >
                  Solicitar cotización
                </ButtonLink>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-background">
        <div className="tp-container py-12 sm:py-16">
          <div className="relative overflow-hidden rounded-[1.5rem] border border-brand/15 bg-gradient-to-br from-brand-soft via-surface to-brand-accent-soft px-6 py-10 sm:px-10">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              ¿No sabés qué técnica necesitás?
            </h2>
            <p className="mt-3 max-w-2xl text-text-secondary">
              Describinos tu idea y evaluaremos la mejor alternativa para producirla.
            </p>
            <div className="mt-6">
              <ButtonLink href="/cotizacion?servicio=personalizado" size="lg">
                Contar mi proyecto
              </ButtonLink>
            </div>
            <p className="mt-4 text-sm text-muted">
              También podés explorar el{" "}
              <Link href="/productos" className="font-medium text-brand hover:underline">
                catálogo de productos
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
