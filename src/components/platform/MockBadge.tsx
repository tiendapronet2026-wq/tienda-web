export function MockBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-warning/30 bg-warning-soft px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-warning ${className}`}
    >
      Datos ficticios · demo
    </span>
  );
}
