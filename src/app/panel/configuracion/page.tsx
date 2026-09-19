import { PageTitle } from "@/components/platform/PageTitle";

export default function PanelConfigPage() {
  return (
    <>
      <PageTitle
        title="Configuración"
        description="Preferencias de plataforma (demo). La conexión Supabase/Vercel real se hará en fases posteriores con acceso verificado."
      />
      <div className="space-y-4 rounded-xl border border-border bg-surface p-6 text-sm text-text-secondary">
        <p>
          <span className="font-semibold text-foreground">Proyecto Supabase (código):</span> ref documentada en AGENTS.md —
          sin SQL remoto en esta fase.
        </p>
        <p>
          <span className="font-semibold text-foreground">Vercel:</span> tienda-web · previews automáticos en PR según
          integración GitHub.
        </p>
        <p>
          <span className="font-semibold text-foreground">Modelo agente recomendado:</span> Composer 2.5 (según
          configuración Cursor del usuario).
        </p>
      </div>
    </>
  );
}
