import Link from "next/link";
import { MockBadge } from "@/components/platform/MockBadge";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { demos } from "@/lib/mock/demos";

export const metadata = {
  title: "Demos interactivas",
  description: "Showroom TiendaPro con datos ficticios.",
};

export default function DemosPage() {
  return (
    <div className="tp-container py-12 sm:py-16">
      <SectionHeader
        eyebrow="Showroom"
        title="Demostraciones interactivas"
        description="Explorá capacidades de la plataforma. Todo el contenido es ficticio y está marcado como demo."
      />
      <div className="mb-8">
        <MockBadge />
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {demos.map((demo) => (
          <Link
            key={demo.slug}
            href={`/demos/${demo.slug}`}
            className="rounded-[var(--radius-xl)] border border-border bg-surface p-6 shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-secondary">{demo.service}</p>
            <h2 className="mt-2 text-xl font-semibold text-foreground">{demo.title}</h2>
            <p className="mt-2 text-sm text-text-secondary">{demo.description}</p>
            <p className="mt-3 text-xs text-muted">{demo.disclaimer}</p>
            <span className="mt-4 inline-flex text-sm font-semibold text-brand">Abrir demo →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
