export function PageTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h1>
      {description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary sm:text-base">{description}</p>}
    </div>
  );
}
