import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/Badge";
import {
  AdminQuoteNotesForm,
  AdminQuoteStatusForm,
} from "@/components/quotes/AdminQuoteActions";
import { SignedDownloadButton } from "@/components/quotes/SignedDownloadButton";
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

export default async function AdminQuoteDetailPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();

  const { data: quote } = await supabase.from("quote_requests").select("*").eq("id", id).maybeSingle();
  if (!quote) notFound();

  const typed = quote as QuoteRequest;
  const status = typed.status as QuoteStatus;

  const { data: attachments } = await supabase
    .from("quote_attachments")
    .select("*")
    .eq("quote_request_id", typed.id)
    .order("created_at", { ascending: true });

  let profileName: string | null = null;
  if (typed.user_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", typed.user_id)
      .maybeSingle();
    if (profile) {
      profileName = `${profile.first_name} ${profile.last_name}`.trim();
    }
  }

  return (
    <div>
      <nav className="text-sm text-text-secondary">
        <Link href="/admin/cotizaciones" className="hover:text-brand">
          ← Volver al listado
        </Link>
      </nav>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand">{typed.quote_number}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">
            {serviceLabel(typed.service_type)}
          </h1>
          <p className="mt-2 text-sm text-muted">
            Creada: {new Date(typed.created_at).toLocaleString("es-AR")} · Actualizada:{" "}
            {new Date(typed.updated_at).toLocaleString("es-AR")}
          </p>
        </div>
        <Badge tone={QUOTE_STATUS_TONES[status]}>{QUOTE_STATUS_LABELS[status]}</Badge>
      </div>

      <div className="mt-8 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <section className="rounded-[var(--radius-xl)] border border-border bg-surface p-6 shadow-[var(--shadow-sm)]">
            <h2 className="text-lg font-semibold text-foreground">Cliente</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <Row label="Nombre" value={typed.customer_name} />
              <Row
                label="Email"
                value={
                  <a href={`mailto:${typed.email}`} className="text-brand hover:underline">
                    {typed.email}
                  </a>
                }
              />
              <Row
                label="Teléfono"
                value={
                  typed.phone ? (
                    <a href={`tel:${typed.phone}`} className="text-brand hover:underline">
                      {typed.phone}
                    </a>
                  ) : (
                    "—"
                  )
                }
              />
              <Row label="Empresa" value={typed.company_name ?? "—"} />
              <Row
                label="Usuario"
                value={typed.user_id ? `${profileName ?? "Registrado"} (${typed.user_id.slice(0, 8)}…)` : "Invitado"}
              />
            </dl>
          </section>

          <section className="rounded-[var(--radius-xl)] border border-border bg-surface p-6 shadow-[var(--shadow-sm)]">
            <h2 className="text-lg font-semibold text-foreground">Descripción</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
              {typed.description}
            </p>
          </section>

          <section className="rounded-[var(--radius-xl)] border border-border bg-surface p-6 shadow-[var(--shadow-sm)]">
            <h2 className="text-lg font-semibold text-foreground">Medidas y detalles</h2>
            <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <Row label="Cantidad" value={typed.quantity?.toString() ?? "—"} />
              <Row
                label="Medidas (mm)"
                value={`${typed.width_mm ?? "—"} × ${typed.height_mm ?? "—"} × ${typed.depth_mm ?? "—"}`}
              />
              <Row label="Material" value={typed.material ?? "—"} />
              <Row label="Color" value={typed.color ?? "—"} />
              <Row label="Color impresión" value={typed.print_color_mode ?? "—"} />
              <Row label="Faz" value={typed.print_sides ?? "—"} />
              <Row label="Papel" value={typed.paper_type ?? "—"} />
              <Row label="Terminación" value={typed.finish ?? "—"} />
              <Row label="Detalle 3D" value={typed.detail_level ?? "—"} />
              <Row label="Área grabado" value={typed.engraving_area ?? "—"} />
              <Row label="Texto/diseño" value={typed.design_text ?? "—"} />
              <Row label="Figura" value={typed.figure_type ?? "—"} />
              <Row label="Fecha deseada" value={typed.deadline_date ?? "—"} />
            </dl>
          </section>

          <section className="rounded-[var(--radius-xl)] border border-border bg-surface p-6 shadow-[var(--shadow-sm)]">
            <h2 className="text-lg font-semibold text-foreground">Archivos</h2>
            {!attachments?.length ? (
              <p className="mt-3 text-sm text-muted">Sin archivos adjuntos.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {(attachments as QuoteAttachment[]).map((file) => (
                  <li
                    key={file.id}
                    className="flex flex-col gap-2 rounded-[var(--radius-md)] bg-background px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="text-sm">
                      <p className="font-medium text-foreground">{file.original_filename}</p>
                      <p className="text-xs text-muted">
                        {file.mime_type} · {formatFileSize(file.file_size)}
                      </p>
                    </div>
                    <SignedDownloadButton attachmentId={file.id} filename={file.original_filename} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-5">
          <section className="rounded-[var(--radius-xl)] border border-border bg-surface p-6 shadow-[var(--shadow-sm)]">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Gestión</h2>
            <AdminQuoteStatusForm quoteId={typed.id} currentStatus={status} />
          </section>
          <section className="rounded-[var(--radius-xl)] border border-border bg-surface p-6 shadow-[var(--shadow-sm)]">
            <AdminQuoteNotesForm quoteId={typed.id} currentNotes={typed.internal_notes} />
          </section>
          <section className="rounded-[var(--radius-xl)] border border-border bg-surface p-6 shadow-[var(--shadow-sm)]">
            <h2 className="text-lg font-semibold text-foreground">Historial básico</h2>
            <ul className="mt-3 space-y-2 text-sm text-text-secondary">
              <li>Creada: {new Date(typed.created_at).toLocaleString("es-AR")}</li>
              <li>Última actualización: {new Date(typed.updated_at).toLocaleString("es-AR")}</li>
              <li>Estado actual: {QUOTE_STATUS_LABELS[status]}</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border/60 py-2 last:border-0">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium text-foreground">{value}</dd>
    </div>
  );
}
