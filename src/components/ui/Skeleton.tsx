export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`tp-skeleton rounded-[var(--radius-md)] ${className}`} aria-hidden />;
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[var(--radius-xl)] border border-border bg-surface shadow-[var(--shadow-sm)]">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="space-y-3 p-5">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-6 w-24" />
      </div>
    </div>
  );
}
