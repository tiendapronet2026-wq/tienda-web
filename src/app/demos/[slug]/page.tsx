import { notFound } from "next/navigation";
import { DemoPublicBanner } from "@/components/platform/DemoPublicBanner";
import { ShowcaseStatusBadge } from "@/components/platform/ShowcaseStatusBadge";
import { getDemo, demos } from "@/lib/mock/demos";
import {
  DemoChatbot,
  DemoDashboard,
  DemoPos,
  DemoStorefront,
} from "@/components/demos/InteractiveDemos";

export function generateStaticParams() {
  return demos.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const demo = getDemo(slug);
  if (!demo) return { title: "Demo" };
  return { title: demo.title, description: demo.description };
}

const demoComponents = {
  tienda: DemoStorefront,
  pos: DemoPos,
  chatbot: DemoChatbot,
  dashboard: DemoDashboard,
};

export default async function DemoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const demo = getDemo(slug);
  if (!demo) notFound();
  const Component = demoComponents[demo.slug];

  return (
    <div>
      <DemoPublicBanner realm="showroom" />
      <div className="tp-container py-12 sm:py-16">
        <ShowcaseStatusBadge status="demo" />
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent">Demo interactiva</p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">{demo.title}</h1>
        <p className="mt-2 text-sm text-text-secondary">{demo.disclaimer}</p>
        <div className="mt-8 rounded-[var(--radius-xl)] border border-border bg-surface p-6 shadow-[var(--shadow-sm)]">
          <Component />
        </div>
      </div>
    </div>
  );
}
