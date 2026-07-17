import { ProductCardSkeleton } from "@/components/ui/Skeleton";

export default function ProductsLoading() {
  return (
    <div className="tp-container py-10 sm:py-12">
      <div className="mb-8 space-y-3">
        <div className="tp-skeleton h-9 w-48 rounded-[var(--radius-md)]" />
        <div className="tp-skeleton h-4 w-80 max-w-full rounded-[var(--radius-md)]" />
      </div>
      <div className="mb-8 tp-skeleton h-24 w-full rounded-[var(--radius-xl)]" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
