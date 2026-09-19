type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
};

export function SectionHeader({ eyebrow, title, description, align = "left" }: SectionHeaderProps) {
  const alignClass = align === "center" ? "mx-auto text-center" : "max-w-2xl";
  return (
    <div className={`mb-10 ${alignClass}`}>
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">{eyebrow}</p>
      )}
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h2>
      {description && <p className="mt-3 text-base leading-relaxed text-text-secondary">{description}</p>}
    </div>
  );
}
