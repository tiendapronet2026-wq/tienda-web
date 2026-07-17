import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import {
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_TONES,
  formatFileSize,
  type QuoteAttachment,
  type QuoteRequest,
  type QuoteStatus,
} from "@/lib/quotes";
import { serviceLabel } from "@/lib/services";

type Props = { params: Promise<{ id: string }> };

export default async function MyQuoteDetailPage({ params }: Props) {
  const { id } = await params;
  const user = await requireAuth(`/login?redirect=/mi-cuenta/cotizaciones/${id}`);
  const supabase = await createClient();

  const { data: quote } = await supabase
    .from("quote_requests")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!quote) notFound();

  const typed = quote as QuoteRequest;
  const status = typed.status as QuoteStatus;

  const { data: attachments } = await supabase
    .from("quote_attachments")
    .select("id, original_filename, mime_type, file_size, created_at")
    .eq("quote_request_id", typed.id)
    .order("created_at", { ascending: true });

  return (
    <div className="tp-container py-10 sm:py-12">
      <nav className="text-sm text-text-secondary">
        <Link href="/mi-cuenta/cotizaciones" className="hover:text-brand">
          ← Mis cotizaciones
        </Link>
      </nav>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand">{typed.quote_number}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">
            {serviceLabel(typed.service_type)}
          </h1>
          <p className="mt-2 text-sm text-muted">
            Enviada el{" "}
            {new Date(typed.created_at).toLocaleString("es-AR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <Badge tone={QUOTE_STATUS_TONES[status]}>{QUOTE_STATUS_LABELS[status]}</Badge>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <section className="rounded-[var(--radius-xl)] border border-border bg-surface p-6 shadow-[var(--shadow-sm)]">
          <h2 className="text-lg font-semibold text-foreground">Descripción</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
            {typed.description}
          </p>
        </section>

        <section className="rounded-[var(--radius-xl)] border border-border bg-surface p-6 shadow-[var(--shadow-sm)]">
          <h2 className="text-lg font-semibold text-foreground">Detalles</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Detail label="Cantidad" value={typed.quantity?.toString()} />
            <Detail
              label="Medidas"
              value={
                [typed.width_mm, typed.height_mm, typed.depth_mm].some(Boolean)
                  ? `${typed.width_mm ?? "—"} × ${typed.height_mm ?? "—"} × ${typed.depth_mm ?? "—"} mm`
                  : null
              }
            />
            <Detail label="Material" value={typed.material} />
            <Detail label="Color" value={typed.color} />
            <Detail label="Terminación" value={typed.finish} />
            <Detail label="Fecha deseada" value={typed.deadline_date} />
          </dl>
        </section>
      </div>

      <section className="mt-5 rounded-[var(--radius-xl)] border border-border bg-surface p-6 shadow-[var(--shadow-sm)]">
        <h2 className="text-lg font-semibold text-foreground">Archivos adjuntos</h2>
        {!attachments?.length ? (
          <p className="mt-3 text-sm text-muted">No se adjuntaron archivos.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm text-text-secondary">
            {(attachments as Pick<QuoteAttachment, "id" | "original_filename" | "file_size">[]).map(
              (file) => (
                <li key={file.id}>
                  {file.original_filename} · {formatFileSize(file.file_size)}
                </li>
              )
            )}
          </ul>
        )}
        <p className="mt-3 text-xs text-muted">
          Los archivos se revisan internamente para preparar tu cotización.
        </p>
      </section>

      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink href="/cotizacion">Enviar otra solicitud</ButtonLink>
        <ButtonLink href="/mi-cuenta/cotizaciones" variant="outline">
          Volver al listado
        </ButtonLink>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 border-b border-border/70 py-2 last:border-0">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium text-foreground">{value}</dd>
    </div>
  );
}
