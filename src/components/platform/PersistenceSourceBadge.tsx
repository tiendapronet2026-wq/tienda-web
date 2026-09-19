export function PersistenceSourceBadge({ source }: { source: "mock" | "supabase" }) {
  if (source === "supabase") {
    return (
      <p className="mb-4 rounded-lg border border-success/30 bg-success-soft px-4 py-2 text-sm text-success">
        Datos desde Supabase TiendaPro (sesión autenticada).
      </p>
    );
  }
  return (
    <p className="mb-4 rounded-lg border border-border bg-surface-muted px-4 py-2 text-sm text-text-secondary">
      <strong className="text-foreground">Mock local</strong> — persistencia desactivada. Active{" "}
      <code className="text-xs">TIENDAPRO_PLATFORM_DB=1</code> y URL del proyecto{" "}
      <code className="text-xs">lwenyboejvwuopsenrwx</code> tras aplicar migración autorizada.
    </p>
  );
}
