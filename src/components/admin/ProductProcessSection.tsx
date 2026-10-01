"use client";

import { useActionState } from "react";
import {
  addProductProcessResource,
  addProductProcessStep,
  deactivateProductProcessResource,
  deactivateProductProcessStep,
  moveProductProcessStep,
  updateProductProcessResource,
  updateProductProcessStep,
} from "@/app/admin/actions/process";
import { Button } from "@/components/ui/Button";
import { calculateProcessResourceCostPerUnit } from "@/lib/cost-engine";
import { formatCost } from "@/lib/utils";

type ActionResult = { error?: string; success?: string } | undefined;

export type ProcessResourceRow = {
  id: string;
  resource_type: "machine" | "labor";
  run_minutes: number;
  setup_minutes: number;
  is_active: boolean;
  machines: { id: string; name: string; total_cost_per_hour: number; is_active: boolean } | null;
  labor_rates: { id: string; name: string; cost_per_hour: number; is_active: boolean } | null;
};

export type ProcessStepRow = {
  id: string;
  name: string;
  position: number;
  batch_size: number;
  is_active: boolean;
  product_process_resources: ProcessResourceRow[];
};

type MachineOption = { id: string; name: string };
type LaborOption = { id: string; name: string };

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

function resourceCostPerUnit(
  res: ProcessResourceRow,
  batchSize: number,
): number | null {
  const masterActive =
    res.resource_type === "machine"
      ? res.machines?.is_active
      : res.labor_rates?.is_active;
  if (!res.is_active || !masterActive) return null;
  const costPerHour =
    res.resource_type === "machine"
      ? Number(res.machines?.total_cost_per_hour ?? 0)
      : Number(res.labor_rates?.cost_per_hour ?? 0);
  try {
    return calculateProcessResourceCostPerUnit(
      costPerHour,
      Number(res.run_minutes),
      Number(res.setup_minutes),
      batchSize,
    );
  } catch {
    return null;
  }
}

function stepSubtotal(step: ProcessStepRow): number {
  const batch = Number(step.batch_size);
  return (step.product_process_resources ?? []).reduce((sum, res) => {
    const unit = resourceCostPerUnit(res, batch);
    return unit != null ? sum + unit : sum;
  }, 0);
}

export function ProductProcessSection({
  productId,
  steps,
  machines,
  laborRates,
  currency,
}: {
  productId: string;
  steps: ProcessStepRow[];
  machines: MachineOption[];
  laborRates: LaborOption[];
  currency: string;
}) {
  const [addStepState, addStepAction, addStepPending] = useFormAction(addProductProcessStep);

  return (
    <section className={section}>
      <h2 className="text-lg font-semibold">Procesos productivos</h2>
      <p className="mt-1 text-sm text-text-secondary">
        Cada paso puede usar máquina y/o mano de obra con tiempos distintos. Run = minutos por
        unidad; setup = minutos por lote (tamaño de lote del paso). Costo/hora máquina:{" "}
        <code className="text-xs">machines.total_cost_per_hour</code> (incluye energía y otros
        componentes ya consolidados).
      </p>

      {!steps.length ? (
        <p className="mt-4 text-sm text-muted">Sin pasos. Creá uno abajo.</p>
      ) : (
        <ul className="mt-6 space-y-6">
          {steps.map((step, index) => (
            <ProcessStepCard
              key={step.id}
              step={step}
              productId={productId}
              currency={currency}
              machines={machines}
              laborRates={laborRates}
              canMoveUp={index > 0}
              canMoveDown={index < steps.length - 1}
              subtotal={stepSubtotal(step)}
            />
          ))}
        </ul>
      )}

      <form action={addStepAction} className="mt-8 border-t border-border pt-6">
        <h3 className="text-sm font-semibold">Nuevo paso</h3>
        <Message state={addStepState} />
        <input type="hidden" name="product_id" value={productId} />
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="block text-sm font-medium sm:col-span-2">
            Nombre
            <input name="name" required className={input} placeholder="Ej. Impresión" />
          </label>
          <label className="block text-sm font-medium">
            Lote (unidades)
            <input
              name="batch_size"
              type="number"
              min="0.000001"
              step="any"
              required
              defaultValue={1}
              className={input}
            />
          </label>
        </div>
        <Button type="submit" size="sm" className="mt-3" disabled={addStepPending}>
          {addStepPending ? "Guardando…" : "Agregar paso"}
        </Button>
      </form>
    </section>
  );
}

function ProcessStepCard({
  step,
  productId,
  currency,
  machines,
  laborRates,
  canMoveUp,
  canMoveDown,
  subtotal,
}: {
  step: ProcessStepRow;
  productId: string;
  currency: string;
  machines: MachineOption[];
  laborRates: LaborOption[];
  canMoveUp: boolean;
  canMoveDown: boolean;
  subtotal: number;
}) {
  const [updateState, updateAction, updatePending] = useFormAction(updateProductProcessStep);
  const [addResState, addResAction, addResPending] = useFormAction(addProductProcessResource);
  const [moveState, moveAction, movePending] = useFormAction(moveProductProcessStep);
  const [offState, offAction, offPending] = useFormAction(deactivateProductProcessStep);

  const resources = step.product_process_resources ?? [];
  const stepMachineIds = new Set(
    resources
      .filter((r) => r.resource_type === "machine" && r.is_active)
      .map((r) => r.machines?.id)
      .filter(Boolean),
  );
  const stepLaborIds = new Set(
    resources
      .filter((r) => r.resource_type === "labor" && r.is_active)
      .map((r) => r.labor_rates?.id)
      .filter(Boolean),
  );
  const availableMachines = machines.filter((m) => !stepMachineIds.has(m.id));
  const availableLabor = laborRates.filter((l) => !stepLaborIds.has(l.id));

  const hasInactiveMaster = resources.some(
    (r) =>
      r.is_active &&
      (r.resource_type === "machine"
        ? !r.machines?.is_active
        : !r.labor_rates?.is_active),
  );

  return (
    <li className="rounded-[var(--radius-lg)] border border-border bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-semibold">
          {step.position}. {step.name}
        </h3>
        <div className="flex flex-wrap gap-2">
          {canMoveUp && (
            <form action={moveAction}>
              <input type="hidden" name="product_id" value={productId} />
              <input type="hidden" name="step_id" value={step.id} />
              <input type="hidden" name="direction" value="up" />
              <Button type="submit" size="sm" variant="outline" disabled={movePending}>
                ↑
              </Button>
            </form>
          )}
          {canMoveDown && (
            <form action={moveAction}>
              <input type="hidden" name="product_id" value={productId} />
              <input type="hidden" name="step_id" value={step.id} />
              <input type="hidden" name="direction" value="down" />
              <Button type="submit" size="sm" variant="outline" disabled={movePending}>
                ↓
              </Button>
            </form>
          )}
          <form action={offAction}>
            <input type="hidden" name="product_id" value={productId} />
            <input type="hidden" name="step_id" value={step.id} />
            <Button type="submit" size="sm" variant="outline" disabled={offPending}>
              Desactivar paso
            </Button>
          </form>
        </div>
      </div>
      <Message state={moveState} />
      <Message state={offState} />

      <form action={updateAction} className="mt-3 grid gap-3 sm:grid-cols-3">
        <input type="hidden" name="product_id" value={productId} />
        <input type="hidden" name="step_id" value={step.id} />
        <label className="block text-sm font-medium sm:col-span-2">
          Nombre
          <input name="name" required defaultValue={step.name} className={input} />
        </label>
        <label className="block text-sm font-medium">
          Lote (unidades)
          <input
            name="batch_size"
            type="number"
            min="0.000001"
            step="any"
            required
            defaultValue={step.batch_size}
            className={input}
          />
        </label>
        <div className="sm:col-span-3">
          <Message state={updateState} />
          <Button type="submit" size="sm" variant="outline" disabled={updatePending}>
            {updatePending ? "…" : "Guardar paso"}
          </Button>
        </div>
      </form>

      {hasInactiveMaster && (
        <p className="mt-3 text-xs text-warning">
          Hay recursos con máquina o tarifa inactiva; no suman al costo hasta reactivarlos.
        </p>
      )}

      <ul className="mt-4 space-y-3">
        {resources.filter((r) => r.is_active).map((res) => (
          <ResourceRow
            key={res.id}
            res={res}
            productId={productId}
            batchSize={Number(step.batch_size)}
            currency={currency}
          />
        ))}
        {!resources.some((r) => r.is_active) && (
          <li className="text-sm text-muted">Sin recursos en este paso.</li>
        )}
      </ul>

      <p className="mt-3 text-sm">
        Subtotal paso (por unidad): <strong>{formatCost(subtotal, currency)}</strong>
      </p>

      <form action={addResAction} className="mt-4 border-t border-border/70 pt-4">
        <h4 className="text-sm font-medium">Agregar recurso</h4>
        <Message state={addResState} />
        <input type="hidden" name="product_id" value={productId} />
        <input type="hidden" name="step_id" value={step.id} />
        <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="block text-sm font-medium">
            Tipo
            <select name="resource_type" required className={input} defaultValue="machine">
              <option value="machine">Máquina</option>
              <option value="labor">Mano de obra</option>
            </select>
          </label>
          <label className="block text-sm font-medium">
            Máquina
            <select name="machine_id" className={input}>
              <option value="">—</option>
              {availableMachines.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Mano de obra
            <select name="labor_rate_id" className={input}>
              <option value="">—</option>
              {availableLabor.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Run (min/unidad)
            <input name="run_minutes" type="number" min="0" step="any" defaultValue={0} className={input} />
          </label>
          <label className="block text-sm font-medium">
            Setup (min/lote)
            <input name="setup_minutes" type="number" min="0" step="any" defaultValue={0} className={input} />
          </label>
        </div>
        <Button type="submit" size="sm" className="mt-2" disabled={addResPending}>
          {addResPending ? "…" : "Agregar recurso"}
        </Button>
      </form>
    </li>
  );
}

function ResourceRow({
  res,
  productId,
  batchSize,
  currency,
}: {
  res: ProcessResourceRow;
  productId: string;
  batchSize: number;
  currency: string;
}) {
  const [state, action, pending] = useFormAction(updateProductProcessResource);
  const [offState, offAction, offPending] = useFormAction(deactivateProductProcessResource);

  const isMachine = res.resource_type === "machine";
  const name = isMachine ? res.machines?.name : res.labor_rates?.name;
  const masterActive = isMachine ? res.machines?.is_active : res.labor_rates?.is_active;
  const costPerHour = isMachine
    ? Number(res.machines?.total_cost_per_hour ?? 0)
    : Number(res.labor_rates?.cost_per_hour ?? 0);
  const unitCost = resourceCostPerUnit(res, batchSize);

  return (
    <li className="rounded-md border border-border/60 p-3 text-sm">
      <div className="flex flex-wrap justify-between gap-2">
        <span>
          <strong>{isMachine ? "Máquina" : "MO"}:</strong> {name ?? "—"}
          {!masterActive && (
            <span className="ml-2 text-warning">(inactivo — no suma)</span>
          )}
        </span>
        <span className="text-muted">
          {formatCost(costPerHour, currency)}/h →{" "}
          {unitCost != null ? (
            <strong>{formatCost(unitCost, currency)}/u</strong>
          ) : (
            "—"
          )}
        </span>
      </div>
      <form action={action} className="mt-2 flex flex-wrap items-end gap-2">
        <input type="hidden" name="product_id" value={productId} />
        <input type="hidden" name="resource_id" value={res.id} />
        <label className="text-xs">
          Run
          <input
            name="run_minutes"
            type="number"
            min="0"
            step="any"
            defaultValue={res.run_minutes}
            className="ml-1 w-20 rounded border border-border px-2 py-1"
          />
        </label>
        <label className="text-xs">
          Setup
          <input
            name="setup_minutes"
            type="number"
            min="0"
            step="any"
            defaultValue={res.setup_minutes}
            className="ml-1 w-20 rounded border border-border px-2 py-1"
          />
        </label>
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          OK
        </Button>
        {state?.error && <span className="text-xs text-error">{state.error}</span>}
      </form>
      <form action={offAction} className="mt-2">
        <input type="hidden" name="product_id" value={productId} />
        <input type="hidden" name="resource_id" value={res.id} />
        <Button type="submit" size="sm" variant="outline" disabled={offPending}>
          Quitar
        </Button>
        {offState?.success && <span className="ml-2 text-xs text-brand">{offState.success}</span>}
      </form>
    </li>
  );
}
