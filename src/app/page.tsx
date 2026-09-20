import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { ServiceCard } from "@/components/platform/ServiceCard";
import { platformServices } from "@/lib/platform/services";

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden bg-background-dark text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 90% 0%, rgba(8,96,232,0.35), transparent 55%), radial-gradient(ellipse 50% 45% at 0% 100%, rgba(10,143,92,0.3), transparent 50%)",
          }}
        />
        <div className="tp-container relative grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-accent">TiendaPro 3.0</p>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl lg:leading-tight">
              Plataforma comercial y centro de operaciones multiproyecto
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
              Web pública premium, showroom de demos y vistas demo de Control y App cliente —
              con datos ficticios hasta conectar producción.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/servicios" size="lg">
                Ver servicios digitales
              </ButtonLink>
              <ButtonLink href="/modulos" size="lg" variant="secondary">
                Catálogo de módulos
              </ButtonLink>
              <ButtonLink
                href="/demos"
                size="lg"
                variant="outline"
                className="border-white/30 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              >
                Explorar demos
              </ButtonLink>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { t: "Showroom", d: "Demos con datos inventados" },
              { t: "Panel", d: "Clientes, proyectos, agentes" },
              { t: "Multi-proyecto", d: "Base para futuros clientes" },
              { t: "Seguro", d: "Sin integraciones externas aún" },
            ].map((card) => (
              <div
                key={card.t}
                className="rounded-2xl border border-white/15 bg-white/5 p-5 backdrop-blur-sm"
              >
                <p className="font-semibold">{card.t}</p>
                <p className="mt-1 text-sm text-white/60">{card.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="tp-container py-16 sm:py-20">
        <SectionHeader
          eyebrow="Servicios"
          title="Soluciones digitales para crecer con control"
          description="Desarrollo web, e-commerce, gestión, POS, chatbots y automatizaciones — diseñadas para integrarse al centro de operaciones TiendaPro."
        />
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {platformServices.map((s) => (
            <ServiceCard key={s.slug} service={s} />
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="tp-container grid items-center gap-10 py-16 lg:grid-cols-2">
          <SectionHeader
            eyebrow="Showroom"
            title="Demostraciones interactivas, claramente ficticias"
            description="Cada demo indica que los datos son de prueba. No simulamos pagos, AFIP ni mensajería real."
          />
          <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
            <ButtonLink href="/demos" size="lg">
              Ir a /demos
            </ButtonLink>
              <ButtonLink href="/control" size="lg" variant="outline">
                Control (demo)
              </ButtonLink>
              <ButtonLink href="/app" size="lg" variant="secondary">
                App cliente (demo)
              </ButtonLink>
          </div>
        </div>
      </section>

      <section className="tp-container py-16 text-center">
        <h2 className="text-2xl font-bold text-foreground sm:text-3xl">¿Seguimos con tu proyecto?</h2>
        <p className="mx-auto mt-3 max-w-xl text-text-secondary">
          Contacto comercial mientras conectamos backend y tenants reales.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink href="mailto:hola@tiendapro.net" size="lg">
            hola@tiendapro.net
          </ButtonLink>
          <Link href="/servicios" className="text-sm font-semibold text-brand self-center">
            Ver catálogo de servicios →
          </Link>
        </div>
      </section>
    </>
  );
}
