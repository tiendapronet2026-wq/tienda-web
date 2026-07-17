type BadgeTone = "available" | "soldout" | "beta" | "active" | "inactive" | "neutral" | "brand";

const tones: Record<BadgeTone, string> = {
  available: "bg-success-soft text-success",
  soldout: "bg-error-soft text-error",
  beta: "bg-brand-secondary-soft text-brand-secondary",
  active: "bg-brand-soft text-brand",
  inactive: "bg-surface-muted text-muted",
  neutral: "bg-surface-muted text-text-secondary",
  brand: "bg-brand-soft text-brand",
};

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
