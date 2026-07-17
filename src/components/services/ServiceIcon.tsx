import { SERVICE_ICONS, type ServiceSlug } from "@/lib/services";

export function ServiceIcon({
  slug,
  className = "h-5 w-5",
}: {
  slug: Exclude<ServiceSlug, "personalizado">;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d={SERVICE_ICONS[slug]} />
    </svg>
  );
}
