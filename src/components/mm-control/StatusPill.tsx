export function StatusPill({
  label,
  tone,
  title,
}: {
  label: string;
  tone: "ok" | "warn" | "muted" | "read" | "err";
  title?: string;
}) {
  const cls =
    tone === "ok"
      ? "border-emerald-800/60 bg-emerald-950/50 text-emerald-300"
      : tone === "warn"
        ? "border-amber-800/60 bg-amber-950/40 text-amber-200"
        : tone === "read"
          ? "border-violet-800/50 bg-violet-950/30 text-violet-200"
          : tone === "err"
            ? "border-red-900/60 bg-red-950/40 text-red-300"
            : "border-[#2a2f36] bg-[#1a1e24] text-[#a8b0bc]";
  return (
    <span
      title={title}
      className={`inline-flex rounded border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${cls}`}
    >
      {label}
    </span>
  );
}
