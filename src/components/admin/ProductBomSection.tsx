"use client";

import { useActionState } from "react";
import {
  addProductBomLine,
  deactivateProductBomLine,
  updateProductBomLineQuantity,
} from "@/app/admin/actions/bom";
import { Button } from "@/components/ui/Button";
import { calculateMaterialCost, calculateProductMaterialCost } from "@/lib/cost-engine";
import { formatCost } from "@/lib/utils";

type ActionResult = { error?: string; success?: string } | undefined;

export type ProductBomLine = {
  id: string;
  quantity: number;
  materials: {
    id: string;
    name: string;
    unit_type: string;
    current_cost: number;
    currency: string;
    is_active: boolean;
  };
};

type MaterialOption = { id: string; name: string; unit_type: string };

const input =
  "mt-1.5 w-full rounded-[var(--radius-md)] border border-border bg-background px-3 py-2.5 text-sm";
const section =
  "mt-8 rounded-[var(--radius-xl)] border border-border bg-surface p-5 shadow-[var(--shadow-sm)] sm:p-6";

function useFormAction(action: (formData: FormData) => Promise<ActionResult>) {
  return useActionState(
    async (_state: ActionResult, formData: FormData) => action(formData),
    undefined,
  );
}

function Message({ state }: { state: ActionResult }) {
  if (!state?.error && !state?.success) return null;
  return (
    <p
      role="status"
      className={`mt-3 rounded-[var(--radius-md)] px-4 py-3 text-sm ${
        state.error ? "bg-error-soft text-error" : "bg-brand-soft text-brand"
      }`}
    >
      {state.error ?? state.success}
    </p>
  );
}

export function ProductBomSection({
  productId,
  lines,
  materials,
  rpcTotal,
  currency,
}: {
  productId: string;
  lines: ProductBomLine[];
  materials: MaterialOption[];
  rpcTotal: number | null;
  currency: string;
}) {
  const [addState, addAction, addPending] = useFormAction(addProductBomLine);

  const eligibleLines = lines.filter((line) => line.materials.is_active);
  const computedTotal = calculateProductMaterialCost(
    eligibleLines.map((line) => ({
      quantity: Number(line.quantity),
      unitCost: Number(line.materials.current_cost),
    })),
  );

  const total = rpcTotal != null ? Number(rpcTotal) : computedTotal;
  const hasInactiveMaterialLines = lines.some((line) => !line.materials.is_active);

  const usedMaterialIds = new Set(lines.map((l) => l.materials.id));
  const availableMaterials = materials.filter((m) => !usedMaterialIds.has(m.id));

  return (
    <section className={section}>
      <h2 className="text-lg font-semibold">Lista de materiales (BOM)</h2>
      <p className="mt-1 text-sm text-text-secondary">
        Cantidades en la unidad base de cada material. El costo unitario se lee de{" "}
        <code className="text-xs">materials.current_cost</code> (no se guarda en la BOM).
      </p>

      {!lines.length ? (
        <p className="mt-4 text-sm text-muted">Sin componentes. Agregá materiales abajo.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase text-muted">
              <tr>
                <th className="py-3 pr-4">Material</th>
                <th className="px-4 py-3">Cantidad</th>
                <th className="px-4 py-3">Costo/u</th>
                <th className="px-4 py-3">Subtotal</th>
                <th className="py-3 pl-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => {
                const qty = Number(line.quantity);
                const unit = Number(line.materials.current_cost);
                const materialActive = line.materials.is_active;
                const subtotal = materialActive ? calculateMaterialCost(unit, qty) : null;
                return (
                  <tr key={line.id} className="border-b border-border/70 last:border-0">
                    <td className="py-3 pr-4">
                      <span className="font-medium">{line.materials.name}</span>
                      {!materialActive && (
                        <span className="ml-2 text-xs font-medium text-amber-700">Material inactivo</span>
                      )}
                      <span className="mt-0.5 block text-xs text-muted">
                        {line.materials.unit_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <BomQuantityForm
                        lineId={line.id}
                        productId={productId}
                        quantity={qty}
                        unitLabel={line.materials.unit_type}
                      />
                    </td>
                    <td className="px-4 py-3 align-top whitespace-nowrap">
                      {formatCost(unit, line.materials.currency)}
                    </td>
                    <td className="px-4 py-3 align-top whitespace-nowrap font-medium">
                      {subtotal != null
                        ? formatCost(subtotal, line.materials.currency)
                        : "— (no suma)"}
                    </td>
                    <td className="py-3 pl-4 align-top">
                      <BomRemoveForm lineId={line.id} productId={productId} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {hasInactiveMaterialLines && (
        <p className="mt-4 text-sm text-amber-800">
          Hay materiales inactivos en la BOM: no se incluyen en el costo total hasta reactivarlos o
          quitar la línea.
        </p>
      )}
      <p className="mt-4 text-base font-semibold">
        Costo materiales: {formatCost(total, currency)}
      </p>

      <form action={addAction} className="mt-6 grid gap-4 border-t border-border pt-6 sm:grid-cols-2">
        <input type="hidden" name="product_id" value={productId} />
        <label className="block text-sm font-medium sm:col-span-2">
          Agregar material
          <select name="material_id" required className={input} defaultValue="">
            <option value="" disabled>Seleccionar material activo</option>
            {availableMaterials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.unit_type})
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Cantidad (unidad base)
          <input
            name="quantity"
            type="number"
            step="any"
            min="0.000001"
            required
            className={input}
            placeholder="Ej. 100"
          />
        </label>
        <div className="flex items-end">
          <Button type="submit" disabled={addPending || !availableMaterials.length}>
            {addPending ? "Guardando…" : "Agregar"}
          </Button>
        </div>
        <Message state={addState} />
      </form>
    </section>
  );
}

function BomQuantityForm({
  lineId,
  productId,
  quantity,
  unitLabel,
}: {
  lineId: string;
  productId: string;
  quantity: number;
  unitLabel: string;
}) {
  const [state, action, pending] = useFormAction(updateProductBomLineQuantity);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="line_id" value={lineId} />
      <input type="hidden" name="product_id" value={productId} />
      <input
        name="quantity"
        type="number"
        step="any"
        min="0.000001"
        defaultValue={quantity}
        required
        className="w-24 rounded-[var(--radius-md)] border border-border px-2 py-1.5 text-sm"
        aria-label={`Cantidad en ${unitLabel}`}
      />
      <span className="text-xs text-muted">{unitLabel}</span>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "…" : "OK"}
      </Button>
      {state?.error && <span className="text-xs text-error">{state.error}</span>}
    </form>
  );
}

function BomRemoveForm({ lineId, productId }: { lineId: string; productId: string }) {
  const [state, action, pending] = useFormAction(deactivateProductBomLine);
  return (
    <form action={action}>
      <input type="hidden" name="line_id" value={lineId} />
      <input type="hidden" name="product_id" value={productId} />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "…" : "Quitar"}
      </Button>
      {state?.success && <span className="ml-2 text-xs text-brand">{state.success}</span>}
      {state?.error && <span className="ml-2 text-xs text-error">{state.error}</span>}
    </form>
  );
}
