import Link from "next/link";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  QUOTE_STATUSES,
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_TONES,
  type QuoteStatus,
} from "@/lib/quotes";
import { MAIN_SERVICES, serviceLabel } from "@/lib/services";

export const metadata: Metadata = {
  title: "Cotizaciones",
};

type Props = {
  searchParams: Promise<{
    estado?: string;
    servicio?: string;
    q?: string;
    desde?: string;
    hasta?: string;
  }>;
};

export default async function AdminQuotesPage({ searchParams }: Props) {
  await requireAdmin();
  const { estado, servicio, q, desde, hasta } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("quote_requests")
    .select(
      "id, quote_number, customer_name, email, service_type, status, quantity, user_id, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (estado && QUOTE_STATUSES.includes(estado as QuoteStatus)) {
    query = query.eq("status", estado);
  }
  if (servicio) {
    query = query.eq("service_type", servicio);
  }
  if (desde) {
    query = query.gte("created_at", `${desde}T00:00:00.000Z`);
  }
  if (hasta) {
    query = query.lte("created_at", `${hasta}T23:59:59.999Z`);
  }
  if (q?.trim()) {
    const term = q.trim();
    query = query.or(
      `customer_name.ilike.%${term}%,email.ilike.%${term}%,quote_number.ilike.%${term}%`
    );
  }

  const { data: quotes } = await query;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Cotizaciones</h1>
        <p className="mt-2 text-text-secondary">Gestioná solicitudes de servicios personalizados.</p>
      </div>

      <form className="mb-6 grid gap-3 rounded-[var(--radius-xl)] border border-border bg-surface p-4 shadow-[var(--shadow-sm)] sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-xs font-medium text-muted">
          Buscar
          <input
            name="q"
            defaultValue={q}
            placeholder="Nombre, email o número"
            className="mt-1 w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs font-medium text-muted">
          Estado
          <select
            name="estado"
            defaultValue={estado ?? ""}
            className="mt-1 w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            {QUOTE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {QUOTE_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-muted">
          Servicio
          <select
            name="servicio"
            defaultValue={servicio ?? ""}
            className="mt-1 w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            {MAIN_SERVICES.map((service) => (
              <option key={service.slug} value={service.slug}>
                {service.title}
              </option>
            ))}
            <option value="personalizado">Personalizado</option>
          </select>
        </label>
        <label className="text-xs font-medium text-muted">
          Desde
          <input
            type="date"
            name="desde"
            defaultValue={desde}
            className="mt-1 w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs font-medium text-muted">
          Hasta
          <input
            type="date"
            name="hasta"
            defaultValue={hasta}
            className="mt-1 w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          />
        </label>
        <div className="sm:col-span-2 lg:col-span-5">
          <button
            type="submit"
            className="rounded-[var(--radius-md)] bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
          >
            Filtrar
          </button>
        </div>
      </form>

      {!quotes?.length ? (
        <EmptyState
          title="Sin cotizaciones"
          description="Cuando lleguen solicitudes, van a aparecer en este listado."
        />
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-xl)] border border-border bg-surface shadow-[var(--shadow-sm)]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-background text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Número</th>
                <th className="px-4 py-3 font-semibold">Fecha</th>
                <th className="px-4 py-3 font-semibold">Cliente</th>
                <th className="px-4 py-3 font-semibold">Servicio</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 font-semibold">Cant.</th>
                <th className="px-4 py-3 font-semibold">Tipo</th>
                <th className="px-4 py-3 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote) => {
                const status = quote.status as QuoteStatus;
                return (
                  <tr key={quote.id} className="border-b border-border/70 last:border-0">
                    <td className="px-4 py-3 font-medium text-foreground">{quote.quote_number}</td>
                    <td className="px-4 py-3 text-text-secondary">
                      {new Date(quote.created_at).toLocaleDateString("es-AR")}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{quote.customer_name}</p>
                      <p className="text-xs text-muted">{quote.email}</p>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {serviceLabel(quote.service_type)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={QUOTE_STATUS_TONES[status]}>
                        {QUOTE_STATUS_LABELS[status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{quote.quantity ?? "—"}</td>
                    <td className="px-4 py-3 text-text-secondary">
                      {quote.user_id ? "Registrado" : "Invitado"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/cotizaciones/${quote.id}`}
                        className="font-semibold text-brand hover:underline"
                      >
                        Ver
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
