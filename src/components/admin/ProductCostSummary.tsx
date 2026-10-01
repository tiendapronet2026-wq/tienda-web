import { formatCost } from "@/lib/utils";

export type ProductionCostRpc = {
  materials_cost: number;
  machine_cost: number;
  labor_cost: number;
  production_cost: number;
  total_cost: number;
};

const section =
  "mt-8 rounded-[var(--radius-xl)] border border-border bg-surface p-5 shadow-[var(--shadow-sm)] sm:p-6";

export function ProductCostSummary({
  breakdown,
  currency,
}: {
  breakdown: ProductionCostRpc | null;
  currency: string;
}) {
  if (!breakdown) {
    return (
      <section className={section}>
        <h2 className="text-lg font-semibold">Costo total calculado</h2>
        <p className="mt-2 text-sm text-muted">
          No se pudo cargar el desglose (aplicá la migración Gate 2B en Supabase si aún no está).
        </p>
      </section>
    );
  }

  const fmt = (n: number) => formatCost(n, currency);

  return (
    <section className={section}>
      <h2 className="text-lg font-semibold">Costo total calculado</h2>
      <p className="mt-1 text-sm text-text-secondary">
        Materiales (BOM) + máquinas + mano de obra. No modifica el precio de venta del producto.
      </p>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Materiales</dt>
          <dd className="font-medium">{fmt(breakdown.materials_cost)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Máquinas</dt>
          <dd className="font-medium">{fmt(breakdown.machine_cost)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Mano de obra</dt>
          <dd className="font-medium">{fmt(breakdown.labor_cost)}</dd>
        </div>
      </dl>
      <p className="mt-4 border-t border-border pt-4 text-base">
        <span className="text-muted">Costo total calculado: </span>
        <strong className="text-brand">{fmt(breakdown.total_cost)}</strong>
      </p>
    </section>
  );
}
