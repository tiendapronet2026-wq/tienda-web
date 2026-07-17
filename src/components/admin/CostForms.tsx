"use client";

import { useActionState, useMemo, useState } from "react";
import {
  linkSupplierMaterial,
  saveCostSettings,
  saveLaborRate,
  saveMachine,
  saveMaterial,
  saveSupplier,
  toggleMaterial,
  toggleSupplier,
  updateMaterialCost,
} from "@/app/admin/actions/costs";
import { Button } from "@/components/ui/Button";
import { calculateLaborCost, calculateMachineCost, roundCurrency } from "@/lib/cost-engine";

type ActionResult = { error?: string; success?: string } | undefined;
type Row = Record<string, unknown>;

const input = "mt-1.5 w-full rounded-[var(--radius-md)] border border-border bg-background px-3 py-2.5 text-sm";
const section = "rounded-[var(--radius-xl)] border border-border bg-surface p-5 shadow-[var(--shadow-sm)] sm:p-6";

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
      className={`rounded-[var(--radius-md)] px-4 py-3 text-sm ${
        state.error ? "bg-error-soft text-error" : "bg-brand-soft text-brand"
      }`}
    >
      {state.error ?? state.success}
    </p>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required,
  step,
  min,
  help,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
  required?: boolean;
  step?: string;
  min?: string;
  help?: string;
}) {
  return (
    <label className="block text-sm font-medium text-foreground">
      {label}
      <input
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        required={required}
        step={step}
        min={min}
        className={input}
      />
      {help && <span className="mt-1 block text-xs font-normal text-muted">{help}</span>}
    </label>
  );
}

function TextArea({ label, name, defaultValue }: { label: string; name: string; defaultValue?: string | null }) {
  return (
    <label className="block text-sm font-medium text-foreground">
      {label}
      <textarea name={name} rows={4} defaultValue={defaultValue ?? ""} className={input} />
    </label>
  );
}

function Check({ label, name, defaultChecked }: { label: string; name: string; defaultChecked?: boolean }) {
  return (
    <label className="flex min-h-11 items-center gap-3 text-sm text-text-secondary">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 rounded border-border" />
      {label}
    </label>
  );
}

export function SupplierForm({ supplier }: { supplier?: Row }) {
  const [state, action, pending] = useFormAction(saveSupplier);
  return (
    <form action={action} className="space-y-5">
      {Boolean(supplier?.id) && <input type="hidden" name="id" value={String(supplier?.id)} />}
      <Message state={state} />
      <section className={section}>
        <h2 className="text-lg font-semibold">Información principal</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Nombre" name="name" required defaultValue={supplier?.name as string} />
          <Field label="Razón social (opcional)" name="legal_name" defaultValue={supplier?.legal_name as string} />
          <Field label="CUIT / identificación fiscal" name="tax_id" defaultValue={supplier?.tax_id as string} />
          <Field label="Persona de contacto" name="contact_name" defaultValue={supplier?.contact_name as string} />
        </div>
      </section>
      <section className={section}>
        <h2 className="text-lg font-semibold">Contacto y dirección</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Email" name="email" type="email" defaultValue={supplier?.email as string} />
          <Field label="Teléfono" name="phone" defaultValue={supplier?.phone as string} />
          <Field label="WhatsApp" name="whatsapp" defaultValue={supplier?.whatsapp as string} />
          <Field label="Sitio web" name="website" type="url" defaultValue={supplier?.website as string} />
          <Field label="Dirección" name="address" defaultValue={supplier?.address as string} />
          <Field label="Ciudad" name="city" defaultValue={supplier?.city as string} />
          <Field label="Provincia" name="province" defaultValue={supplier?.province as string} />
          <Field label="País" name="country" defaultValue={(supplier?.country as string) ?? "Argentina"} />
        </div>
      </section>
      <section className={section}>
        <h2 className="text-lg font-semibold">Condiciones comerciales</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Condiciones de pago" name="payment_terms" defaultValue={supplier?.payment_terms as string} />
          <Field label="Plazo habitual (días)" name="lead_time_days" type="number" min="0" defaultValue={supplier?.lead_time_days as number} />
        </div>
        <div className="mt-4"><TextArea label="Notas" name="notes" defaultValue={supplier?.notes as string} /></div>
        <div className="mt-4"><Check label="Proveedor activo" name="is_active" defaultChecked={supplier ? Boolean(supplier.is_active) : true} /></div>
      </section>
      <Button type="submit" disabled={pending}>{pending ? "Guardando..." : "Guardar proveedor"}</Button>
    </form>
  );
}

export function SupplierStatusButton({ id, isActive }: { id: string; isActive: boolean }) {
  const [state, action, pending] = useActionState(
    async () => toggleSupplier(id, !isActive),
    undefined as ActionResult,
  );
  return (
    <div>
      <Button type="button" size="sm" variant={isActive ? "destructive" : "outline"} disabled={pending} onClick={() => action()}>
        {pending ? "Procesando..." : isActive ? "Desactivar" : "Reactivar"}
      </Button>
      <Message state={state} />
    </div>
  );
}

const units = [
  "unidad", "hoja", "resma", "kilogramo", "gramo", "metro", "centimetro",
  "metro_cuadrado", "centimetro_cuadrado", "litro", "mililitro", "plancha",
  "rollo", "caja", "paquete", "hora", "minuto", "otro",
];

export function MaterialForm({
  material,
  categories,
  suppliers,
}: {
  material?: Row;
  categories: Row[];
  suppliers: Row[];
}) {
  const [state, action, pending] = useFormAction(saveMaterial);
  return (
    <form action={action} className="space-y-5">
      {Boolean(material?.id) && <input type="hidden" name="id" value={String(material?.id)} />}
      <Message state={state} />
      <section className={section}>
        <h2 className="text-lg font-semibold">Información básica</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Nombre" name="name" required defaultValue={material?.name as string} />
          <Field label="SKU interno" name="sku" defaultValue={material?.sku as string} />
          <label className="block text-sm font-medium">Categoría
            <select name="category_id" defaultValue={(material?.category_id as string) ?? ""} className={input}>
              <option value="">Sin categoría</option>
              {categories.map((category) => <option key={String(category.id)} value={String(category.id)}>{String(category.name)}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium">Unidad de consumo
            <select name="unit_type" required defaultValue={(material?.unit_type as string) ?? "unidad"} className={input}>
              {units.map((unit) => <option key={unit} value={unit}>{unit.replaceAll("_", " ")}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-4"><TextArea label="Descripción" name="description" defaultValue={material?.description as string} /></div>
      </section>
      <section className={section}>
        <h2 className="text-lg font-semibold">Costo, merma y margen</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {!material && <Field label="Costo inicial" name="initial_cost" type="number" min="0" step="0.0001" defaultValue={0} />}
          <Field label="Moneda" name="currency" defaultValue={(material?.currency as string) ?? "ARS"} />
          <Field label="Merma (%)" name="waste_percentage" type="number" min="0" step="0.01" defaultValue={(material?.waste_percentage as number) ?? 0} help="Material que normalmente se pierde durante el proceso." />
          <Field label="Margen sugerido (%)" name="suggested_margin_percentage" type="number" min="0" step="0.01" defaultValue={(material?.suggested_margin_percentage as number) ?? 0} />
          <label className="block text-sm font-medium">Proveedor preferido
            <select name="preferred_supplier_id" defaultValue={(material?.preferred_supplier_id as string) ?? ""} className={input}>
              <option value="">Sin proveedor</option>
              {suppliers.map((supplier) => <option key={String(supplier.id)} value={String(supplier.id)}>{String(supplier.name)}</option>)}
            </select>
          </label>
        </div>
      </section>
      <section className={section}>
        <h2 className="text-lg font-semibold">Stock y notas</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Stock actual" name="current_stock" type="number" min="0" step="0.0001" defaultValue={material?.current_stock as number} />
          <Field label="Stock mínimo" name="minimum_stock" type="number" min="0" step="0.0001" defaultValue={material?.minimum_stock as number} />
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Check label="Controlar stock de este material" name="stock_tracking_enabled" defaultChecked={Boolean(material?.stock_tracking_enabled)} />
          <Check label="Material activo" name="is_active" defaultChecked={material ? Boolean(material.is_active) : true} />
        </div>
        <div className="mt-4"><TextArea label="Notas" name="notes" defaultValue={material?.notes as string} /></div>
      </section>
      <Button type="submit" disabled={pending}>{pending ? "Guardando..." : "Guardar material"}</Button>
    </form>
  );
}

export function MaterialStatusButton({ id, isActive }: { id: string; isActive: boolean }) {
  const [state, action, pending] = useActionState(async () => toggleMaterial(id, !isActive), undefined as ActionResult);
  return (
    <div>
      <Button type="button" size="sm" variant={isActive ? "destructive" : "outline"} disabled={pending} onClick={() => action()}>
        {isActive ? "Desactivar" : "Reactivar"}
      </Button>
      <Message state={state} />
    </div>
  );
}

export function MaterialCostForm({ materialId, currency, suppliers }: { materialId: string; currency: string; suppliers: Row[] }) {
  const [state, action, pending] = useFormAction(updateMaterialCost);
  return (
    <form action={action} className={`${section} space-y-4`}>
      <input type="hidden" name="material_id" value={materialId} />
      <h2 className="text-lg font-semibold">Registrar nuevo costo</h2>
      <Message state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nuevo costo" name="new_cost" type="number" min="0" step="0.0001" required />
        <Field label="Moneda" name="currency" defaultValue={currency} required />
        <label className="block text-sm font-medium">Proveedor
          <select name="supplier_id" className={input}><option value="">Sin especificar</option>{suppliers.map((s) => <option key={String(s.id)} value={String(s.id)}>{String(s.name)}</option>)}</select>
        </label>
        <Field label="Fecha efectiva" name="effective_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
        <Field label="Cantidad comprada" name="quantity_purchased" type="number" min="0" step="0.0001" />
        <Field label="Unidad de compra" name="purchase_unit" />
        <Field label="Referencia / factura" name="reference" />
      </div>
      <TextArea label="Notas" name="notes" />
      <Button type="submit" disabled={pending}>{pending ? "Registrando..." : "Actualizar costo"}</Button>
    </form>
  );
}

export function SupplierMaterialForm({ materialId, suppliers }: { materialId: string; suppliers: Row[] }) {
  const [state, action, pending] = useFormAction(linkSupplierMaterial);
  return (
    <form action={action} className={`${section} space-y-4`}>
      <input type="hidden" name="material_id" value={materialId} />
      <h2 className="text-lg font-semibold">Asociar proveedor</h2>
      <Message state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">Proveedor
          <select required name="supplier_id" className={input}><option value="">Seleccionar</option>{suppliers.map((s) => <option key={String(s.id)} value={String(s.id)}>{String(s.name)}</option>)}</select>
        </label>
        <Field label="SKU del proveedor" name="supplier_sku" />
        <Field label="Unidad de compra" name="purchase_unit" />
        <Field label="Factor de conversión" name="unit_conversion_factor" type="number" min="0.000001" step="0.000001" defaultValue={1} />
        <Field label="Último precio informado" name="latest_purchase_price" type="number" min="0" step="0.0001" />
        <Field label="Moneda" name="currency" defaultValue="ARS" />
      </div>
      <Check label="Marcar como proveedor preferido" name="is_preferred" />
      <Button type="submit" size="sm" disabled={pending}>Asociar</Button>
    </form>
  );
}

const machineTypes = [
  ["printer_paper", "Impresora de papel"], ["printer_3d", "Impresora 3D"],
  ["laser_engraver", "Grabadora láser"], ["polifan_cutter", "Cortadora de polifan"],
  ["computer", "Computadora"], ["finishing_tool", "Herramienta de terminación"], ["other", "Otra"],
];

export function MachineForm({ machine, electricityPrice }: { machine?: Row; electricityPrice: number }) {
  const [state, action, pending] = useFormAction(saveMachine);
  return (
    <form action={action} className="space-y-5">
      {Boolean(machine?.id) && <input type="hidden" name="id" value={String(machine?.id)} />}
      <Message state={state} />
      <section className={section}>
        <h2 className="text-lg font-semibold">Máquina o equipo</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Nombre" name="name" required defaultValue={machine?.name as string} />
          <label className="block text-sm font-medium">Tipo
            <select name="machine_type" required defaultValue={(machine?.machine_type as string) ?? "other"} className={input}>{machineTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          </label>
          <Field label="Marca" name="brand" defaultValue={machine?.brand as string} />
          <Field label="Modelo" name="model" defaultValue={machine?.model as string} />
          <Field label="Número de serie" name="serial_number" defaultValue={machine?.serial_number as string} />
          <Field label="Fecha de compra" name="purchase_date" type="date" defaultValue={machine?.purchase_date as string} />
        </div>
      </section>
      <section className={section}>
        <h2 className="text-lg font-semibold">Cálculo por hora</h2>
        {electricityPrice <= 0 && <p className="mt-2 rounded-lg bg-warning-soft p-3 text-sm text-warning">Configurá el precio de electricidad para calcular energía automáticamente.</p>}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Precio de compra" name="purchase_price" type="number" min="0" step="0.01" defaultValue={machine?.purchase_price as number} />
          <Field label="Vida útil estimada (horas)" name="estimated_useful_life_hours" type="number" min="0" step="0.01" defaultValue={machine?.estimated_useful_life_hours as number} />
          <Field label="Horas acumuladas" name="accumulated_usage_hours" type="number" min="0" step="0.01" defaultValue={(machine?.accumulated_usage_hours as number) ?? 0} />
          <Field label="Potencia (W)" name="power_watts" type="number" min="0" step="0.01" defaultValue={machine?.power_watts as number} />
          <Field label="Energía / hora" name="energy_cost_per_hour" type="number" min="0" step="0.0001" defaultValue={(machine?.energy_cost_per_hour as number) ?? 0} />
          <Field label="Mantenimiento / hora" name="maintenance_cost_per_hour" type="number" min="0" step="0.0001" defaultValue={(machine?.maintenance_cost_per_hour as number) ?? 0} />
          <Field label="Depreciación / hora" name="depreciation_cost_per_hour" type="number" min="0" step="0.0001" defaultValue={(machine?.depreciation_cost_per_hour as number) ?? 0} />
          <Field label="Otros costos / hora" name="additional_cost_per_hour" type="number" min="0" step="0.0001" defaultValue={(machine?.additional_cost_per_hour as number) ?? 0} />
          <Field label="Preparación predeterminada (min)" name="setup_minutes_default" type="number" min="0" defaultValue={(machine?.setup_minutes_default as number) ?? 0} />
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Check label="Calcular energía con potencia y precio kWh" name="auto_energy" />
          <Check label="Calcular depreciación con precio y vida útil" name="auto_depreciation" />
          <Check label="Máquina activa" name="is_active" defaultChecked={machine ? Boolean(machine.is_active) : true} />
        </div>
        <div className="mt-4"><TextArea label="Notas" name="notes" defaultValue={machine?.notes as string} /></div>
      </section>
      <Button type="submit" disabled={pending}>{pending ? "Guardando..." : "Guardar máquina"}</Button>
    </form>
  );
}

export function MachineCalculator({ costPerHour }: { costPerHour: number }) {
  const [minutes, setMinutes] = useState(60);
  return (
    <div className={section}>
      <h2 className="text-lg font-semibold">Calculadora interna</h2>
      <label className="mt-4 block text-sm font-medium">Minutos de uso
        <input className={input} type="number" min="0" value={minutes} onChange={(e) => setMinutes(Math.max(0, Number(e.target.value)))} />
      </label>
      <p className="mt-4 text-sm text-text-secondary">Horas: <strong>{roundCurrency(minutes / 60, 2)}</strong></p>
      <p className="mt-1 text-xl font-bold text-brand">Costo: {roundCurrency(calculateMachineCost(costPerHour, minutes), 2).toLocaleString("es-AR", { style: "currency", currency: "ARS" })}</p>
    </div>
  );
}

export function LaborManager({ rates }: { rates: Row[] }) {
  const [selected, setSelected] = useState("");
  const [minutes, setMinutes] = useState(60);
  const rate = useMemo(() => rates.find((item) => String(item.id) === selected), [rates, selected]);
  const [state, action, pending] = useFormAction(saveLaborRate);
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <form action={action} className={`${section} space-y-4`}>
        <h2 className="text-lg font-semibold">Nuevo concepto</h2><Message state={state} />
        <Field label="Concepto" name="name" required />
        <TextArea label="Descripción" name="description" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Costo por hora" name="cost_per_hour" type="number" min="0" step="0.0001" required />
          <Field label="Tarifa sugerida por hora" name="suggested_sale_rate_per_hour" type="number" min="0" step="0.0001" />
          <Field label="Moneda" name="currency" defaultValue="ARS" />
        </div>
        <Check label="Activo" name="is_active" defaultChecked />
        <Button type="submit" disabled={pending}>Crear concepto</Button>
      </form>
      <div className={section}>
        <h2 className="text-lg font-semibold">Calculadora de mano de obra</h2>
        <label className="mt-4 block text-sm font-medium">Concepto
          <select className={input} value={selected} onChange={(e) => setSelected(e.target.value)}><option value="">Seleccionar</option>{rates.filter((r) => r.is_active).map((r) => <option key={String(r.id)} value={String(r.id)}>{String(r.name)}</option>)}</select>
        </label>
        <label className="mt-4 block text-sm font-medium">Minutos
          <input className={input} type="number" min="0" value={minutes} onChange={(e) => setMinutes(Math.max(0, Number(e.target.value)))} />
        </label>
        {rate && <>
          <p className="mt-4 text-sm">Costo interno: <strong>{roundCurrency(calculateLaborCost(Number(rate.cost_per_hour), minutes), 2).toLocaleString("es-AR", { style: "currency", currency: String(rate.currency) })}</strong></p>
          <p className="mt-1 text-sm">Precio sugerido: <strong>{rate.suggested_sale_rate_per_hour == null ? "Sin configurar" : roundCurrency(calculateLaborCost(Number(rate.suggested_sale_rate_per_hour), minutes), 2).toLocaleString("es-AR", { style: "currency", currency: String(rate.currency) })}</strong></p>
        </>}
      </div>
    </div>
  );
}

export function LaborRateEditor({ rate }: { rate: Row }) {
  const [state, action, pending] = useFormAction(saveLaborRate);
  return (
    <form action={action} className={`${section} space-y-3`}>
      <input type="hidden" name="id" value={String(rate.id)} />
      <Message state={state} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Field label="Concepto" name="name" required defaultValue={String(rate.name)} />
        <Field label="Costo/h" name="cost_per_hour" type="number" min="0" step="0.0001" defaultValue={Number(rate.cost_per_hour)} />
        <Field label="Tarifa sugerida/h" name="suggested_sale_rate_per_hour" type="number" min="0" step="0.0001" defaultValue={rate.suggested_sale_rate_per_hour as number} />
        <Field label="Moneda" name="currency" defaultValue={String(rate.currency)} />
        <div className="flex items-end"><Check label="Activo" name="is_active" defaultChecked={Boolean(rate.is_active)} /></div>
      </div>
      <TextArea label="Descripción" name="description" defaultValue={rate.description as string} />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>{pending ? "Guardando..." : "Guardar cambios"}</Button>
    </form>
  );
}

export function SettingsForm({ settings }: { settings: Row }) {
  const [state, action, pending] = useFormAction(saveCostSettings);
  return (
    <form action={action} className={`${section} max-w-3xl space-y-5`}>
      <input type="hidden" name="id" value={String(settings.id)} /><Message state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Moneda" name="currency" defaultValue={String(settings.currency)} required />
        <Field label="Precio electricidad por kWh" name="electricity_price_per_kwh" type="number" min="0" step="0.0001" defaultValue={Number(settings.electricity_price_per_kwh)} help="No se utiliza hasta que una máquina solicita cálculo automático." />
        <Field label="Margen general (%)" name="default_profit_margin_percentage" type="number" min="0" step="0.01" defaultValue={Number(settings.default_profit_margin_percentage)} />
        <Field label="Merma predeterminada (%)" name="default_waste_percentage" type="number" min="0" step="0.01" defaultValue={Number(settings.default_waste_percentage)} />
        <Field label="Gastos indirectos (%)" name="fixed_overhead_percentage" type="number" min="0" step="0.01" defaultValue={Number(settings.fixed_overhead_percentage)} />
        <Field label="Porcentaje impositivo opcional" name="tax_percentage" type="number" min="0" step="0.01" defaultValue={Number(settings.tax_percentage)} help="No modifica catálogo ni cotizaciones actuales." />
        <Field label="Días para costo desactualizado" name="cost_stale_days" type="number" min="1" defaultValue={Number(settings.cost_stale_days)} help="Se marca si no fue revisado dentro de este período." />
      </div>
      <Button type="submit" disabled={pending}>{pending ? "Guardando..." : "Guardar configuración"}</Button>
    </form>
  );
}
