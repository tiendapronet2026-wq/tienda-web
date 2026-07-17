import Link from "next/link";
import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_TONES,
  type QuoteRequest,
  type QuoteStatus,
} from "@/lib/quotes";
import { serviceLabel } from "@/lib/services";

export const metadata: Metadata = {
  title: "Mis cotizaciones",
};

export default async function MyQuotesPage() {
  const user = await requireAuth("/login?redirect=/mi-cuenta/cotizaciones");
  const supabase = await createClient();

  const { data } = await supabase
    .from("quote_requests")
    .select(
      "id, quote_number, service_type, status, description, created_at, quantity"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const quotes = (data ?? []) as Pick<
    QuoteRequest,
    "id" | "quote_number" | "service_type" | "status" | "description" | "created_at" | "quantity"
  >[];

  return (
    <div className="tp-container py-10 sm:py-12">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Mi cuenta</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">Mis cotizaciones</h1>
          <p className="mt-2 text-text-secondary">
            Consultá el estado de tus solicitudes de servicios personalizados.
          </p>
        </div>
        <ButtonLink href="/cotizacion">Solicitar una cotización</ButtonLink>
      </div>

      {quotes.length === 0 ? (
        <EmptyState
          title="Todavía no tenés cotizaciones"
          description="Cuando envíes una solicitud, vas a poder seguirla acá."
          actionHref="/cotizacion"
          actionLabel="Solicitar una cotización"
        />
      ) : (
        <div className="space-y-4">
          {quotes.map((quote) => {
            const status = quote.status as QuoteStatus;
            return (
              <article
                key={quote.id}
                className="rounded-[var(--radius-xl)] border border-border bg-surface p-5 shadow-[var(--shadow-sm)] sm:p-6"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-brand">{quote.quote_number}</p>
                    <h2 className="mt-1 text-lg font-semibold text-foreground">
                      {serviceLabel(quote.service_type)}
                    </h2>
                    <p className="mt-1 text-sm text-muted">
                      {new Date(quote.created_at).toLocaleDateString("es-AR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                      {quote.quantity ? ` · Cantidad: ${quote.quantity}` : ""}
                    </p>
                  </div>
                  <Badge tone={QUOTE_STATUS_TONES[status]}>{QUOTE_STATUS_LABELS[status]}</Badge>
                </div>
                <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-text-secondary">
                  {quote.description}
                </p>
                <Link
                  href={`/mi-cuenta/cotizaciones/${quote.id}`}
                  className="mt-4 inline-flex text-sm font-semibold text-brand hover:underline"
                >
                  Ver detalle →
                </Link>
              </article>
            );
          })}
        </div>
      )}

      <div className="mt-8">
        <ButtonLink href="/mi-cuenta" variant="outline">
          Volver a mi cuenta
        </ButtonLink>
      </div>
    </div>
  );
}
