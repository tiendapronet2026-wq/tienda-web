import Link from "next/link";
import { StatusPill } from "@/components/mm-control/StatusPill";
import { mmControlConfigured, mmControlFetch } from "@/lib/mm-control/server";

type Overview = {
  ok: boolean;
  kpis: Record<string, number>;
  system: {
    healthy: boolean;
    economic_state: string;
    spending_authorized: boolean;
    auto_paid_spend: boolean;
  };
  projects: {
    slug: string;
    name: string;
    status: string;
    access: string;
    connection?: { status: string } | null;
    gateway_reachable?: boolean;
  }[];
  attention: { project: string; message: string; action: string }[];
};

export default async function MmHomePage() {
  const configured = mmControlConfigured();
  const overview = configured
    ? await mmControlFetch<Overview>("/overview")
    : { ok: false as const, status: 503, error: "not_configured" };

  const data = overview.ok ? overview.data : null;

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm text-[#a8b0bc]">Centro operativo · cerebro central de proyectos</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <StatusPill
            label={data?.system.healthy ? "Sistema saludable" : "Requiere atención"}
            tone={data?.system.healthy ? "ok" : "warn"}
          />
          <StatusPill label="USD 0" tone="ok" />
          <StatusPill label={`IA ${data?.system.economic_state ?? "—"}`} tone="warn" />
        </div>
      </section>

      {!configured || !data ? (
        <p className="rounded-lg border border-amber-900/40 bg-amber-950/20 p-4 text-sm text-amber-100">
          Puente server-side M&M pendiente de configuración en Vercel (
          <code className="text-xs">MM_TIENDAPRO_CONTROL_BRIDGE_SECRET</code>). La UI está lista; los datos
          aparecerán cuando el secreto coincida con el Worker.
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Proyectos", data.kpis.projects],
              ["Ejecuciones hoy", data.kpis.executions_today],
              ["Capacidades piloto", data.kpis.capabilities],
              ["Costo", data.kpis.cost_usd],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-lg border border-[#2a2f36] bg-[#14181d] p-4">
                <p className="text-xs text-[#a8b0bc]">{label}</p>
                <p className="mt-1 text-2xl font-semibold text-[#f3f0e8]">{value}</p>
              </div>
            ))}
          </div>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[#a8b0bc]">Proyectos</h2>
            <div className="mt-3 grid gap-4 lg:grid-cols-2">
              {data.projects.map((p) => (
                <div key={p.slug} className="rounded-lg border border-[#2a2f36] bg-[#14181d] p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold">{p.name}</h3>
                    <StatusPill label={p.status} tone={p.status === "ACTIVE" ? "ok" : "warn"} />
                    <StatusPill label={p.access} tone="read" />
                  </div>
                  {p.slug === "casa_leon" ? (
                    <p className="mt-2 text-sm text-[#a8b0bc]">
                      Geli · Gateway {p.gateway_reachable ? "alcanzable" : "—"} · Conexión{" "}
                      {p.connection?.status ?? "—"}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-[#a8b0bc]">M&M Console · capacidades Tienda Pro</p>
                  )}
                  <Link
                    href={`/control/mm/proyectos/${p.slug === "casa_leon" ? "casa-leon" : p.slug}`}
                    className="mt-4 inline-block text-sm font-medium text-amber-400 hover:text-amber-300"
                  >
                    Abrir proyecto →
                  </Link>
                </div>
              ))}
            </div>
          </section>

          {data.attention.length > 0 ? (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[#a8b0bc]">Necesita tu atención</h2>
              <ul className="mt-3 space-y-2">
                {data.attention.map((a) => (
                  <li
                    key={a.project + a.message}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#2a2f36] px-4 py-3 text-sm"
                  >
                    <span>{a.message}</span>
                    <Link href={a.action} className="text-amber-400 hover:underline">Revisar</Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
