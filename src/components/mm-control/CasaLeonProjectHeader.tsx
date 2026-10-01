import { StatusPill } from "./StatusPill";

export type CasaLeonOperational = {
  status_label: string;
  access_label: string;
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

export function CasaLeonProjectHeader({ projectStatus, connectionStatus, operational }: Props) {
  const isActive = projectStatus === "ACTIVE";
  const envSlug = operational?.mm_environment?.slug;

  return (
    <div>
      <div className="mt-2 flex flex-wrap gap-2">
        <StatusPill label={projectStatus} tone={isActive ? "ok" : "warn"} />
        <StatusPill label={operational?.access_label ?? "Solo lectura"} tone="read" />
        {envSlug ? (
          <StatusPill
            label={`Registro M&M: ${envSlug}`}
            tone="muted"
            title={operational?.mm_environment_note ?? undefined}
          />
        ) : null}
        <StatusPill
          label={`Gateway ${connectionStatus}`}
          tone={connectionStatus === "ACTIVE" ? "ok" : "muted"}
        />
      </div>
      {isActive && operational ? (
        <ul className="mt-3 space-y-1 text-sm text-[#a8b0bc]">
          <li>
            <span className="text-[#f3f0e8]">Estado operativo:</span> {operational.status_label}
          </li>
          <li>
            <span className="text-[#f3f0e8]">Acceso:</span> {operational.access_label}
          </li>
          <li>
            <span className="text-[#f3f0e8]">IA generativa:</span> {operational.generative_ia_label}
          </li>
          {operational.mm_environment_note ? (
            <li className="text-xs text-[#8a919c]">{operational.mm_environment_note}</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
