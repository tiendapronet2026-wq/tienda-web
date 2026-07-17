import { ButtonLink } from "@/components/ui/Button";

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="rounded-[var(--radius-xl)] border border-dashed border-border bg-surface px-6 py-14 text-center shadow-[var(--shadow-sm)]">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <path d="M4 7h16M4 12h10M4 17h7" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-text-secondary">{description}</p>
      {actionHref && actionLabel && (
        <div className="mt-6">
          <ButtonLink href={actionHref}>{actionLabel}</ButtonLink>
        </div>
      )}
    </div>
  );
}
