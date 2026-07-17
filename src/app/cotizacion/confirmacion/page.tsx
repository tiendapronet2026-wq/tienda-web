import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Solicitud recibida",
};

type Props = {
  searchParams: Promise<{ codigo?: string }>;
};

export default async function QuoteConfirmationPage({ searchParams }: Props) {
  const { codigo } = await searchParams;
  const user = await getCurrentUser();
  const quoteNumber = codigo?.trim() || null;

  return (
    <div className="tp-container py-14 sm:py-20">
      <div className="mx-auto max-w-xl rounded-[1.5rem] border border-border bg-surface px-6 py-10 text-center shadow-[var(--shadow-sm)] sm:px-10">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand">
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M5 12l5 5L20 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Recibimos tu solicitud
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-text-secondary sm:text-base">
          {quoteNumber ? (
            <>
              Tu cotización quedó registrada con el número{" "}
              <strong className="text-foreground">{quoteNumber}</strong>. Revisaremos los detalles
              del proyecto para preparar una respuesta.
            </>
          ) : (
            <>
              Tu cotización quedó registrada. Revisaremos los detalles del proyecto para preparar
              una respuesta.
            </>
          )}
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <ButtonLink href="/">Volver al inicio</ButtonLink>
          <ButtonLink href="/productos" variant="outline">
            Ver productos
          </ButtonLink>
          <ButtonLink href="/cotizacion" variant="outline">
            Enviar otra solicitud
          </ButtonLink>
        </div>

        {user && (
          <div className="mt-6">
            <ButtonLink href="/mi-cuenta/cotizaciones" variant="ghost">
              Ver mis cotizaciones
            </ButtonLink>
          </div>
        )}
      </div>
    </div>
  );
}
