# Motor interno de costos

El módulo usa valores decimales con hasta cuatro posiciones en PostgreSQL. Las funciones de
`src/lib/cost-engine.ts` escalan temporalmente los importes a enteros (`× 10.000`) para reducir
errores de coma flotante.

## Fórmulas

- Material: `costo unitario × cantidad consumida`.
- BOM producto (Gate 2A): `SUM(cantidad BOM × materials.current_cost)` — ver `calculate_product_material_cost` (SQL) y `calculateProductMaterialCost` (TS).
- Procesos (Gate 2B): run/setup por recurso + `batch_size` del paso — ver `calculateProcessResourceCostPerUnit` (TS) y `calculate_product_production_cost` (SQL). Ver `docs/cost-production-g2b.md`.
- Pricing (Gate 3A): margen **sobre venta** vs recargo sobre costo — ver `src/lib/pricing-engine.ts` y `docs/pricing-foundation-g3a.md`. `applyMargin` en este archivo es **markup** (legacy), no margen sobre venta.
- Merma: `costo × (1 + porcentaje / 100)`.
- Máquina: `costo total por hora × minutos / 60`.
- Energía: `(potencia W / 1.000) × precio kWh`.
- Depreciación: `precio de compra / vida útil estimada en horas`.
- Mano de obra: `costo por hora × minutos / 60`.
- Gastos indirectos: `subtotal × (1 + porcentaje / 100)`.
- Precio sugerido: `costo interno × (1 + margen / 100)`.
- Impuesto opcional: se conserva como configuración; no se aplica al catálogo ni a cotizaciones.

## Unidades y redondeo

Cada material define su unidad de consumo. Las conversiones de compra se guardan en
`supplier_materials.unit_conversion_factor`. Los cálculos internos conservan cuatro decimales y la
presentación monetaria redondea según el contexto.

## Costo vs. precio

El costo interno incluye recursos consumidos. El precio sugerido agrega merma, gastos indirectos y
margen. Ninguna función guarda datos ni modifica cotizaciones: recibe valores explícitos y devuelve
un resultado puro.

## Unidad base y presentación de compra (Gate 1)

- `materials.unit_type` define la **unidad base** (ej. `hoja`, `gramo`).
- `materials.current_cost` es siempre el costo **por unidad base**.
- La compra suele ser una **presentación** (resma, kg): en `supplier_materials.unit_conversion_factor`
  se guarda cuántas unidades base incluye una presentación.
- Conversión determinista (TypeScript y RPC `compute_material_unit_cost`):

  `costo unitario = precio de compra / unidades base por presentación`

- Ejemplos: resma $10.000 / 500 hojas → $20/hoja; filamento $20.000 / 1000 g → $20/g.
- Redondeo de costo unitario persistido: **4 decimales** (`numeric(14,4)` / `deriveUnitCostFromPurchase`).

## Historial e idempotencia

- `update_material_cost` escribe en `material_cost_history` sin sobrescribir entradas previas.
- Opcional `idempotency_key`: reintentos con la misma clave no duplican filas de historial.
- Sin clave idempotente, la deduplicación es responsabilidad del cliente (una acción de usuario = una llamada).
