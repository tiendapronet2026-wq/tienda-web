import Link from "next/link";
import type { PlatformService } from "@/lib/platform/services";

const accentMap = {
  brand: "from-brand/20 to-brand-soft border-brand/25",
  secondary: "from-brand-secondary/20 to-brand-secondary-soft border-brand-secondary/25",
  accent: "from-brand-accent/25 to-brand-accent-soft border-brand-accent/30",
};

export function ServiceCard({ service }: { service: PlatformService }) {
  return (
    <article className="group flex h-full flex-col rounded-[var(--radius-xl)] border border-border bg-surface p-6 shadow-[var(--shadow-sm)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]">
      <div className={`mb-4 h-1 w-14 rounded-full bg-gradient-to-r ${accentMap[service.accent]}`} />
      <h3 className="text-lg font-semibold text-foreground">{service.title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-text-secondary">{service.shortDescription}</p>
      <ul className="mt-4 space-y-1.5 text-sm text-text-secondary">
        {service.highlights.slice(0, 2).map((h) => (
          <li key={h} className="flex gap-2">
            <span className="text-brand">·</span>
            {h}
          </li>
        ))}
      </ul>
      <Link
        href={`/servicios/${service.slug}`}
        className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-brand transition group-hover:gap-2"
      >
        Ver servicio <span aria-hidden>→</span>
      </Link>
    </article>
  );
}
