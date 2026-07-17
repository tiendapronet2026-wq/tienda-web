import type { Metadata } from "next";
import { QuoteForm } from "@/components/quotes/QuoteForm";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth/session";
import { isServiceSlug, serviceLabel, type ServiceSlug } from "@/lib/services";

export const metadata: Metadata = {
  title: "Solicitar cotización",
  description:
    "Pedí una cotización para impresiones, impresión 3D, grabado láser, corte de polifan o trabajos personalizados.",
};

type Props = {
  searchParams: Promise<{ servicio?: string }>;
};

export default async function QuotePage({ searchParams }: Props) {
  const { servicio } = await searchParams;
  const initialService: ServiceSlug =
    servicio && isServiceSlug(servicio) ? servicio : "personalizado";

  const user = await getCurrentUser();
  const profile = user ? await getCurrentProfile() : null;

  const prefill = {
    customerName: profile
      ? `${profile.first_name} ${profile.last_name}`.trim()
      : undefined,
    email: user?.email ?? undefined,
    phone: profile?.phone ?? undefined,
  };

  return (
    <div className="tp-container py-10 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Cotización</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Solicitá tu cotización
        </h1>
        <p className="mt-3 text-text-secondary">
          Completá los datos de tu proyecto. Servicio seleccionado:{" "}
          <strong className="text-foreground">{serviceLabel(initialService)}</strong>.
        </p>
        <p className="mt-2 text-sm text-muted">
          No te preocupes si no conocés todos los datos técnicos. Describinos tu idea y te ayudamos.
        </p>

        <div className="mt-8">
          <QuoteForm initialService={initialService} prefill={prefill} />
        </div>
      </div>
    </div>
  );
}
