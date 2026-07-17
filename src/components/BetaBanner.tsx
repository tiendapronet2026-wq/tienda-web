export function BetaBanner() {
  return (
    <div className="border-b border-brand/10 bg-brand-soft/70 px-4 py-2 text-center text-xs text-text-secondary sm:text-sm">
      <span className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
        <span className="inline-flex items-center gap-1.5 text-brand" aria-hidden>
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3l2.2 4.5 5 .7-3.6 3.5.9 5.1L12 14.8 7.5 16.8l.9-5.1L4.8 8.2l5-.7L12 3z" />
          </svg>
        </span>
        <span>TiendaPro está creciendo · Las compras online estarán disponibles próximamente.</span>
      </span>
    </div>
  );
}
