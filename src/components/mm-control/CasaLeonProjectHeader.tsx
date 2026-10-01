export type CasaLeonOperational = {
  status_label: string;
  mm_connected_label?: string;
  access_label: string;
  intelligence_label?: string;
  generative_ia_label: string;
  connection_key: string | null;
  mm_environment: { slug: string; name: string } | null;
  mm_environment_note: string | null;
};

type Props = {
  projectStatus: string;
  connectionStatus: string;
  operational: CasaLeonOperational | null;
};

function fallbackMmConnected(connectionStatus: string): string {
  return connectionStatus === "ACTIVE" ? "Conectado" : "No conectado";
}

export function CasaLeonProjectHeader({ projectStatus, connectionStatus, operational }: Props) {
  const isActive = projectStatus === "ACTIVE";
  const status = operational?.status_label ?? (isActive ? "Activo" : "En preparación");
  const mm =
    operational?.mm_connected_label ?? fallbackMmConnected(connectionStatus);
  const access = operational?.access_label ?? "Solo lectura";
  const intelligence =
    operational?.intelligence_label ?? (isActive && connectionStatus === "ACTIVE" ? "Disponible" : "No disponible");
  const generativeIa =
    operational?.generative_ia_label ?? "Desactivada por política de costos";

  const rows = [
    { label: "Estado", value: status },
    { label: "M&M", value: mm },
    { label: "Acceso", value: access },
    { label: "Inteligencia", value: intelligence },
    { label: "IA generativa", value: generativeIa },
  ];

  return (
    <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2 lg:max-w-xl">
      {rows.map((row) => (
        <div key={row.label} className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
          <dt className="text-[#8a919c]">{row.label}:</dt>
          <dd className="font-medium text-[#f3f0e8]">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
