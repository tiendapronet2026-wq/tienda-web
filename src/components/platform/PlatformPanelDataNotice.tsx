export function PlatformPanelDataNotice({ section }: { section: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-muted px-4 py-6 text-sm text-text-secondary">
      <p className="font-semibold text-foreground">Modo plataforma (Supabase)</p>
      <p className="mt-2">
        La sección <strong>{section}</strong> no expone datos mock en paneles privados. Los datos reales se
        conectarán en la siguiente iteración; si ves este mensaje con sesión válida, la autorización está activa.
      </p>
    </div>
  );
}
