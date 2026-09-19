import { PageTitle } from "@/components/platform/PageTitle";

export default function ControlConfigPage() {
  return (
    <>
      <PageTitle title="Configuración Control" description="Parámetros globales TiendaPro (demo)." />
      <p className="text-sm text-text-secondary">
        Auth real: <code className="text-xs">src/lib/auth/claims.ts</code> · Realms{" "}
        <code className="text-xs">control</code> vs <code className="text-xs">tenant-app</code>.
      </p>
    </>
  );
}
