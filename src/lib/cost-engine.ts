const SCALE = BigInt(10_000);
const TWO = BigInt(2);

function scaled(value: number): bigint {
  if (!Number.isFinite(value)) throw new Error("Valor numérico inválido");
  return BigInt(Math.round(value * Number(SCALE)));
}

function unscaled(value: bigint): number {
  return Number(value) / Number(SCALE);
}

function multiply(value: number, factor: number): number {
  return unscaled((scaled(value) * scaled(factor) + SCALE / TWO) / SCALE);
}

export function calculateMaterialCost(unitCost: number, quantity: number): number {
  if (unitCost < 0 || quantity < 0) throw new Error("Costo y cantidad deben ser positivos");
  return multiply(unitCost, quantity);
}

/** Roll-up BOM: SUM(cantidad × costo unitario base del material). */
export function calculateProductMaterialCost(
  lines: Array<{ quantity: number; unitCost: number }>,
): number {
  let total = 0;
  for (const line of lines) {
    if (line.quantity <= 0) throw new Error("Cantidad BOM debe ser positiva");
    if (line.unitCost < 0) throw new Error("Costo unitario inválido");
    total += calculateMaterialCost(line.unitCost, line.quantity);
  }
  return roundCurrency(total, 4);
}

export function calculateMachineCost(costPerHour: number, minutes: number): number {
  if (costPerHour < 0 || minutes < 0) throw new Error("Costo y minutos deben ser positivos");
  return multiply(costPerHour, minutes / 60);
}

export function calculateLaborCost(costPerHour: number, minutes: number): number {
  return calculateMachineCost(costPerHour, minutes);
}

/** Costo por unidad: run (por unidad) + setup amortizado por lote. */
export function calculateProcessResourceCostPerUnit(
  costPerHour: number,
  runMinutes: number,
  setupMinutes: number,
  batchSize: number,
): number {
  if (batchSize <= 0) throw new Error("El tamaño de lote debe ser mayor que cero.");
  if (costPerHour < 0 || runMinutes < 0 || setupMinutes < 0) {
    throw new Error("Costo y minutos deben ser válidos.");
  }
  if (runMinutes <= 0 && setupMinutes <= 0) {
    throw new Error("Indicá minutos de run o de setup.");
  }
  const runPart = runMinutes > 0 ? calculateMachineCost(costPerHour, runMinutes) : 0;
  const setupPerUnit =
    setupMinutes > 0 ? calculateMachineCost(costPerHour, setupMinutes) / batchSize : 0;
  return roundCurrency(runPart + setupPerUnit, 4);
}

export type ProductionCostBreakdown = {
  materialsCost: number;
  machineCost: number;
  laborCost: number;
  productionCost: number;
  totalCost: number;
};

export function calculateProductProductionCostFromParts(
  materialsCost: number,
  machineCost: number,
  laborCost: number,
): ProductionCostBreakdown {
  const machine = roundCurrency(machineCost, 4);
  const labor = roundCurrency(laborCost, 4);
  const materials = roundCurrency(materialsCost, 4);
  const productionCost = roundCurrency(machine + labor, 4);
  const totalCost = roundCurrency(materials + productionCost, 4);
  return {
    materialsCost: materials,
    machineCost: machine,
    laborCost: labor,
    productionCost,
    totalCost,
  };
}

export type ProcessResourceLine = {
  type: "machine" | "labor";
  costPerHour: number;
  runMinutes: number;
  setupMinutes: number;
  resourceActive: boolean;
  lineActive: boolean;
};

export type ProcessStepLine = {
  batchSize: number;
  stepActive: boolean;
  resources: ProcessResourceLine[];
};

/** Suma costos de proceso (solo pasos/recursos activos y recurso maestro activo). */
export function sumProcessResourceCosts(steps: ProcessStepLine[]): {
  machineCost: number;
  laborCost: number;
} {
  let machine = 0;
  let labor = 0;
  for (const step of steps) {
    if (!step.stepActive || step.batchSize <= 0) continue;
    for (const res of step.resources) {
      if (!res.lineActive || !res.resourceActive) continue;
      const unit = calculateProcessResourceCostPerUnit(
        res.costPerHour,
        res.runMinutes,
        res.setupMinutes,
        step.batchSize,
      );
      if (res.type === "machine") machine += unit;
      else labor += unit;
    }
  }
  return {
    machineCost: roundCurrency(machine, 4),
    laborCost: roundCurrency(labor, 4),
  };
}

export function applyWaste(cost: number, percentage: number): number {
  if (percentage < 0 || percentage > 100) throw new Error("Merma inválida");
  return multiply(cost, 1 + percentage / 100);
}

export function applyOverhead(cost: number, percentage: number): number {
  if (percentage < 0) throw new Error("Gastos indirectos inválidos");
  return multiply(cost, 1 + percentage / 100);
}

export function applyMargin(cost: number, percentage: number): number {
  if (percentage < 0) throw new Error("Margen inválido");
  return multiply(cost, 1 + percentage / 100);
}

export function calculateEnergyCost(powerWatts: number, pricePerKwh: number): number {
  if (powerWatts < 0 || pricePerKwh < 0) throw new Error("Potencia y precio deben ser positivos");
  return multiply(powerWatts / 1000, pricePerKwh);
}

export function calculateDepreciationCost(purchasePrice: number, usefulLifeHours: number): number {
  if (purchasePrice < 0 || usefulLifeHours <= 0) throw new Error("Datos de depreciación inválidos");
  return unscaled((scaled(purchasePrice) * SCALE) / scaled(usefulLifeHours));
}

export function roundCurrency(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/** Costo por unidad base = precio de la presentación / unidades base incluidas (ej. resma 500 hojas). */
export function deriveUnitCostFromPurchase(purchasePrice: number, unitsPerPurchase: number): number {
  if (purchasePrice < 0 || unitsPerPurchase <= 0) {
    throw new Error("Precio de compra y unidades por presentación deben ser positivos");
  }
  const unitScaled = (scaled(purchasePrice) * SCALE + scaled(unitsPerPurchase) / TWO) / scaled(unitsPerPurchase);
  return roundCurrency(unscaled(unitScaled), 4);
}
