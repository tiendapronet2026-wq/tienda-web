import Link from "next/link";
import { mmControlConfigured, mmControlFetch } from "@/lib/mm-control/server";
import { StatusPill } from "@/components/mm-control/StatusPill";

export default async function MmProjectsPage() {
  const overview = mmControlConfigured() ? await mmControlFetch<{ projects: { slug: string; name: string; status: string }[] }>("/overview") : null;
  const projects = overview?.ok ? overview.data.projects : [];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Proyectos</h2>
      {projects.length === 0 ? (
        <p className="text-sm text-[#a8b0bc]">Sin datos (configure el puente M&M).</p>
      ) : (
        <ul className="divide-y divide-[#2a2f36] rounded-lg border border-[#2a2f36]">
          {projects.map((p) => (
            <li key={p.slug} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-medium">{p.name}</p>
                <StatusPill label={p.status} tone={p.status === "ACTIVE" ? "ok" : "warn"} />
              </div>
              <Link
                href={`/control/mm/proyectos/${p.slug === "casa_leon" ? "casa-leon" : p.slug}`}
                className="text-sm text-amber-400"
              >
                Abrir
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
