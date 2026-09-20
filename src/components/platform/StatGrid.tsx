type Stat = { label: string; value: string | number; hint?: string };

export function StatGrid({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-[var(--radius-xl)] border border-border bg-surface p-5 shadow-[var(--shadow-sm)]"
        >
          <p className="text-sm text-text-secondary">{s.label}</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{s.value}</p>
          {s.hint && <p className="mt-1 text-xs text-muted">{s.hint}</p>}
        </div>
      ))}
    </div>
  );
}
