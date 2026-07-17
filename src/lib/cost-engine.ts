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

export function calculateMachineCost(costPerHour: number, minutes: number): number {
  if (costPerHour < 0 || minutes < 0) throw new Error("Costo y minutos deben ser positivos");
  return multiply(costPerHour, minutes / 60);
}

export function calculateLaborCost(costPerHour: number, minutes: number): number {
  return calculateMachineCost(costPerHour, minutes);
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
