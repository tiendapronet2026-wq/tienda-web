import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { BrandLogo } from "@/components/BrandLogo";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/server";

const trustItems = [
  {
    title: "Trabajos personalizados",
    description: "Proyectos a medida según lo que necesitás producir.",
    icon: (
      <>
        <path d="M12 3l2.2 4.5 5 .7-3.6 3.5.9 5.1L12 14.8 7.5 16.8l.9-5.1L4.8 8.2l5-.7L12 3z" />
      </>
    ),
  },
  {
    title: "Múltiples técnicas de producción",
    description: "Impresión, 3D, grabado láser y corte de polifan.",
    icon: <path d="M4 7h16v10H4zM8 7V5h8v2M9 11h6M9 14h4" />,
  },
  {
    title: "Stock y productos organizados",
    description: "Catálogo claro, con disponibilidad visible.",
    icon: <path d="M4 6h7v7H4zM13 6h7v4h-7zM13 12h7v6h-7zM4 15h7v3H4z" />,
  },
  {
    title: "Atención para cada proyecto",
    description: "Acompañamiento claro desde la idea hasta la producción.",
    icon: (
      <>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 19c1.8-3.2 4.2-4.5 7-4.5s5.2 1.3 7 4.5" />
      </>
    ),
  },
];

const services = [
  {
    id: "impresion-papel",
    title: "Impresiones en papel",
    description: "Impresiones para trabajos, eventos, material comercial y proyectos personalizados.",
    accent: "from-brand/15 to-brand-soft",
    iconBg: "bg-brand-soft text-brand",
    icon: <path d="M7 4h10v5H7zM5 9h14v7H5zM8 16h8v4H8zM9 12h6" />,
  },
  {
    id: "impresion-3d",
    title: "Impresión 3D",
    description: "Piezas, prototipos, llaveros, accesorios y diseños personalizados.",
    accent: "from-brand-secondary/15 to-brand-secondary-soft",
    iconBg: "bg-brand-secondary-soft text-brand-secondary",
    icon: (
      <>
        <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
        <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" />
      </>
    ),
  },
  {
    id: "grabado-laser",
    title: "Grabado láser",
    description: "Grabados precisos para regalos, productos, señalética y piezas personalizadas.",
    accent: "from-brand-accent/20 to-brand-accent-soft",
    iconBg: "bg-brand-accent-soft text-brand-accent",
    icon: (
      <>
        <path d="M4 18h16M7 18l5-12 5 12" />
        <path d="M9.5 12h5" />
      </>
    ),
  },
  {
    id: "corte-polifan",
    title: "Corte de polifan",
    description: "Formas, letras y elementos decorativos cortados con precisión.",
    accent: "from-brand/10 via-brand-secondary/10 to-brand-accent/10",
    iconBg: "bg-surface-muted text-brand-secondary",
    icon: <path d="M4 6l8-2 8 2v4l-8 2-8-2V6zm0 8l8 2 8-2v4l-8 2-8-2v-4z" />,
  },
];

const whyItems = [
  "Productos y servicios en un mismo lugar.",
  "Opciones personalizadas para cada proyecto.",
  "Catálogo organizado y fácil de explorar.",
  "Plataforma preparada para seguir creciendo.",
];

function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-md lg:mx-0 lg:max-w-none">
      <div
        className="pointer-events-none absolute inset-6 rounded-[2rem] bg-gradient-to-br from-brand/25 via-brand-secondary/20 to-brand-accent/25 blur-3xl"
        aria-hidden
      />

      <div className="relative grid gap-3 sm:gap-4">
        <div className="tp-float grid grid-cols-[1.1fr_0.9fr] gap-3 sm:gap-4">
          <div className="rounded-2xl border border-white/12 bg-white/[0.07] p-4 shadow-[var(--shadow-md)] backdrop-blur-sm sm:p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand/20 text-brand-accent">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                <path d="M7 4h10v5H7zM5 9h14v7H5zM8 16h8v4H8z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-white">Impresión</p>
            <p className="mt-1 text-xs leading-relaxed text-white/55">Papel y material comercial</p>
          </div>
          <div className="tp-float-delayed rounded-2xl border border-white/12 bg-gradient-to-br from-brand-secondary/25 to-white/[0.04] p-4 shadow-[var(--shadow-md)] backdrop-blur-sm sm:p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-secondary/25 text-white">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
                <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-white">3D</p>
            <p className="mt-1 text-xs leading-relaxed text-white/55">Piezas y prototipos</p>
          </div>
        </div>

        <div className="grid grid-cols-[0.9fr_1.1fr] gap-3 sm:gap-4">
          <div className="tp-float-delayed rounded-2xl border border-white/12 bg-white/[0.06] p-4 shadow-[var(--shadow-md)] backdrop-blur-sm sm:p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-accent/20 text-brand-accent">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                <path d="M4 18h16M7 18l5-12 5 12M9.5 12h5" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-white">Láser</p>
            <p className="mt-1 text-xs leading-relaxed text-white/55">Grabado preciso</p>
          </div>
          <div className="rounded-2xl border border-white/12 bg-white/[0.08] p-4 shadow-[var(--shadow-md)] backdrop-blur-sm sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/20 text-brand">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                  <path d="M4 6l8-2 8 2v4l-8 2-8-2V6zm0 8l8 2 8-2v4l-8 2-8-2v-4z" />
                </svg>
              </div>
              <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/70">
                Personalizado
              </span>
            </div>
            <p className="text-sm font-semibold text-white">Corte y diseño</p>
            <p className="mt-1 text-xs leading-relaxed text-white/55">Polifan, formas y detalles a medida</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function HomePage() {
  const supabase = await createClient();

  const [{ data: products }, { data: categories }, { data: productCounts }] = await Promise.all([
    supabase
      .from("products")
      .select("*, categories(*)")
      .eq("is_active", true)
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("categories").select("*").eq("is_active", true).order("sort_order").order("name"),
    supabase.from("products").select("category_id").eq("is_active", true),
  ]);

  const countByCategory = new Map<string, number>();
  for (const row of productCounts ?? []) {
    if (!row.category_id) continue;
    countByCategory.set(row.category_id, (countByCategory.get(row.category_id) ?? 0) + 1);
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-background-dark text-white">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 65% 50% at 88% 12%, rgba(8,96,232,0.28), transparent 55%), radial-gradient(ellipse 50% 42% at 8% 88%, rgba(10,143,92,0.26), transparent 52%), radial-gradient(circle at 52% 42%, rgba(0,180,216,0.1), transparent 42%)",
          }}
        />
        <div
          className="pointer-events-none absolute -right-24 top-8 h-80 w-80 rounded-full border border-white/10 opacity-30 tp-orbit"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-20 bottom-4 h-56 w-56 rotate-12 rounded-[2rem] border border-brand-accent/20 bg-brand-accent/5"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute right-1/3 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full border border-brand/20 bg-brand/10 blur-sm"
          aria-hidden
        />

        <div className="tp-container relative grid items-center gap-10 py-14 sm:gap-12 sm:py-16 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14 lg:py-20">
          <div className="tp-fade-up max-w-2xl">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-brand-accent">
              Productos y soluciones personalizadas
            </p>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-[3.15rem] lg:leading-[1.12]">
              Convertimos tus ideas en productos reales.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">
              Impresiones, diseños personalizados, producción 3D, grabado láser y una selección de
              productos para cada proyecto.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <ButtonLink href="/productos" size="lg" className="w-full sm:w-auto">
                Ver productos
              </ButtonLink>
              <ButtonLink
                href="/servicios"
                size="lg"
                variant="outline"
                className="w-full border-white/25 bg-white/5 text-white hover:border-white/40 hover:bg-white/10 hover:text-white sm:w-auto"
              >
                Conocer servicios
              </ButtonLink>
            </div>
            <p className="mt-8 text-sm text-white/55">Calidad, precisión y atención personalizada.</p>
          </div>

          <div className="hidden sm:block">
            <HeroVisual />
          </div>

          <div className="sm:hidden">
            <div className="rounded-2xl border border-white/12 bg-white/[0.06] p-4 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/20 text-brand-accent">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                    <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zM12 12l8-4.5M12 12v9M12 12L4 7.5" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Producción y personalización</p>
                  <p className="text-xs text-white/55">Impresión · 3D · Láser · Polifan</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="border-b border-border bg-surface" aria-label="Beneficios">
        <div className="tp-container grid gap-4 py-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5 lg:py-12">
          {trustItems.map((item) => (
            <div
              key={item.title}
              className="rounded-[var(--radius-xl)] border border-border bg-surface p-5 shadow-[var(--shadow-sm)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                  {item.icon}
                </svg>
              </div>
              <h2 className="text-sm font-semibold text-foreground">{item.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section id="servicios" className="scroll-mt-24 border-b border-border bg-background py-14 sm:py-16">
        <div className="tp-container">
          <div className="mb-8 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Servicios</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Soluciones para hacer realidad tus ideas
            </h2>
            <p className="mt-2 text-text-secondary">
              Elegí el servicio que necesitás y prepará tu próximo proyecto con TiendaPro.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {services.map((service) => (
              <article
                key={service.id}
                className="group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-xl)] border border-border bg-surface p-6 shadow-[var(--shadow-sm)] transition duration-200 hover:-translate-y-0.5 hover:border-brand/35 hover:shadow-[var(--shadow-md)]"
              >
                <div
                  className={`pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${service.accent}`}
                  aria-hidden
                />
                <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${service.iconBg}`}>
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                    {service.icon}
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-foreground">{service.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-text-secondary">{service.description}</p>
                <div className="mt-5 flex flex-col gap-2">
                  <Link
                    href={`/servicios/${service.id}`}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand transition group-hover:gap-2"
                  >
                    Ver servicio
                    <span aria-hidden>→</span>
                  </Link>
                  <Link
                    href={`/cotizacion?servicio=${service.id}`}
                    className="text-sm font-medium text-text-secondary transition hover:text-brand"
                  >
                    Solicitar cotización
                  </Link>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-8">
            <ButtonLink href="/servicios" variant="outline">
              Ver todos los servicios
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* Featured products */}
      <section className="border-b border-border bg-surface">
        <div className="tp-container py-14 sm:py-16">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Catálogo</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Productos destacados
              </h2>
              <p className="mt-2 text-text-secondary">
                Encontrá opciones listas para elegir, personalizar y agregar a tu carrito.
              </p>
            </div>
            <ButtonLink href="/productos" variant="outline" className="self-start sm:self-auto">
              Ver todos los productos
            </ButtonLink>
          </div>

          {products && products.length > 0 ? (
            <>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              <div className="mt-10 flex justify-center">
                <ButtonLink href="/productos" size="lg">
                  Ver todos los productos
                </ButtonLink>
              </div>
            </>
          ) : (
            <EmptyState
              title="Todavía no hay productos"
              description="Cuando se publiquen artículos activos, van a aparecer acá."
              actionHref="/productos"
              actionLabel="Ir al catálogo"
            />
          )}
        </div>
      </section>

      {/* Categories */}
      {categories && categories.length > 0 && (
        <section className="tp-container py-14 sm:py-16">
          <div className="mb-8 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Categorías</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Explorá por categoría
            </h2>
            <p className="mt-2 text-text-secondary">Encontrá más rápido lo que necesitás.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category, index) => {
              const count = countByCategory.get(category.id) ?? 0;
              const softTones = [
                "bg-brand-soft text-brand",
                "bg-brand-secondary-soft text-brand-secondary",
                "bg-brand-accent-soft text-brand-accent",
                "bg-surface-muted text-brand-secondary",
              ];
              const tone = softTones[index % softTones.length];

              return (
                <Link
                  key={category.id}
                  href={`/productos?categoria=${category.slug}`}
                  className="group flex min-h-[148px] flex-col justify-between rounded-[var(--radius-xl)] border border-border bg-surface p-6 shadow-[var(--shadow-sm)] transition duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-[var(--shadow-md)]"
                >
                  <div>
                    <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}>
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                        <path d="M4 7h16M4 12h16M4 17h10" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">{category.name}</h3>
                    <p className="mt-1 text-sm text-text-secondary">
                      {count === 1 ? "1 producto" : `${count} productos`}
                    </p>
                  </div>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand transition group-hover:gap-2">
                    Ver categoría
                    <span aria-hidden>→</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Mid commercial banner */}
      <section className="tp-container pb-14 sm:pb-16">
        <div className="relative overflow-hidden rounded-[1.5rem] border border-brand/15 bg-gradient-to-br from-brand-soft via-surface to-brand-accent-soft px-6 py-12 sm:px-10 sm:py-14 lg:px-14">
          <div className="pointer-events-none absolute -right-6 -top-6 opacity-[0.1]" aria-hidden>
            <BrandLogo variant="mark" size="lg" href={null} />
          </div>
          <div
            className="pointer-events-none absolute -bottom-10 -left-8 h-40 w-40 rounded-full bg-brand/10 blur-2xl"
            aria-hidden
          />
          <div className="relative max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
              Proyectos personalizados
            </p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              ¿Tenés una idea y necesitás producirla?
            </h2>
            <p className="mt-3 text-base leading-relaxed text-text-secondary">
              Contanos qué necesitás, adjuntá tu diseño y prepararemos una cotización personalizada.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/cotizacion" size="lg">
                Solicitar cotización
              </ButtonLink>
              <ButtonLink href="/servicios" size="lg" variant="outline">
                Ver servicios
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      {/* Why TiendaPro */}
      <section className="border-y border-border bg-surface">
        <div className="tp-container grid items-center gap-10 py-14 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Por qué TiendaPro</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Una forma más simple de crear y comprar
            </h2>
            <ul className="mt-7 space-y-4">
              {whyItems.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                  </span>
                  <span className="text-base text-text-secondary">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative overflow-hidden rounded-[1.5rem] border border-border bg-background p-8 sm:p-10">
            <div
              className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-brand-secondary/10 blur-2xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-10 -left-6 h-36 w-36 rounded-full bg-brand/10 blur-2xl"
              aria-hidden
            />
            <div className="relative">
              <div className="mb-6 opacity-90">
                <BrandLogo variant="mark" size="md" href={null} />
              </div>
              <p className="text-lg font-semibold tracking-tight text-foreground">
                Productos listos y producción a medida, en una misma experiencia.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                Explorá el catálogo o conocé las técnicas disponibles para tu próximo proyecto.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <ButtonLink href="/productos" size="sm">
                  Ver productos
                </ButtonLink>
                <ButtonLink href="/servicios" size="sm" variant="outline">
                  Ver servicios
                </ButtonLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact / quote CTA */}
      <section id="contacto" className="scroll-mt-24 bg-background py-14 sm:py-16">
        <div className="tp-container">
          <div className="mx-auto max-w-2xl rounded-[1.5rem] border border-border bg-surface px-6 py-10 text-center shadow-[var(--shadow-sm)] sm:px-10">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Cotización</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
              Contanos tu proyecto
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary sm:text-base">
              Completá el formulario con los detalles de tu idea, adjuntá archivos si los tenés y
              recibí una cotización personalizada.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <ButtonLink href="/cotizacion">Solicitar cotización</ButtonLink>
              <ButtonLink href="/servicios" variant="outline">
                Ver servicios
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden bg-background-dark text-white">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 55% 70% at 15% 50%, rgba(10,143,92,0.22), transparent 60%), radial-gradient(ellipse 45% 55% at 90% 40%, rgba(8,96,232,0.2), transparent 55%)",
          }}
        />
        <div className="tp-container relative py-14 text-center sm:py-16">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Empezá a explorar TiendaPro</h2>
          <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-white/65">
            Descubrí nuestros productos y conocé todas las posibilidades para tu próximo proyecto.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href="/productos" size="lg">
              Ver productos
            </ButtonLink>
            <ButtonLink
              href="/servicios"
              size="lg"
              variant="outline"
              className="border-white/25 bg-white/5 text-white hover:border-white/40 hover:bg-white/10 hover:text-white"
            >
              Explorar servicios
            </ButtonLink>
          </div>
        </div>
      </section>
    </div>
  );
}
