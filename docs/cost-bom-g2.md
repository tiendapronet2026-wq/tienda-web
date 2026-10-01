# Gate 2 — Productos + BOM + roll-up de costos (2A materiales)

## Preflight (2026-10-01)

### REUTILIZADO

| Área | Detalle |
|------|---------|
| `products` | Catálogo tienda con `cost_price` manual (venta); sin BOM previo |
| `categories` | Categorías de productos (e-commerce) |
| `materials` | Unidad base + `current_cost` (Gate 1) |
| `material_cost_history` | Historial de costos por material (base para “costo en fecha X” futuro) |
| `machines` / `labor_rates` | Modelo admin existente; **fuera del roll-up 2A** |
| Admin | `/admin/productos/[id]`, acciones `products.ts`, patrón `CostForms` |
| Motor TS | `calculateMaterialCost`, precisión en `cost-engine.ts` |
| Seguridad costos | RLS `Costos: solo admin` + `is_admin()` |
| RPC patrón | `update_material_cost` como referencia de `SECURITY DEFINER` |

### FALTANTE (implementado en Gate 2A)

- Tabla `product_bom_lines` (producto → material → cantidad)
- RPC `calculate_product_material_cost(product_id)`
- UI BOM en ficha de producto admin
- Server actions `bom.ts`
- Tests de roll-up en `cost-engine.test.ts`

### RIESGOS

| Riesgo | Mitigación |
|--------|------------|
| Sin variantes de producto hoy | `product_variant_id` nullable, índice único solo `variant_id is null` |
| `products.cost_price` vs BOM | BOM no sobrescribe `cost_price`; roll-up es referencia de costo materiales |
| Histórico “costo producto día X” | Ver sección *Historical BOM* — **no resuelto** en 2A |
| Máquinas / mano de obra | **Gate 2B** — no mezclar costos parciales incorrectos |
| Tenant / `is_admin()` #19 | Sin cambios en Gate 2 |

## Regla de unidades

`quantity` en BOM = unidades de `materials.unit_type`.  
Costo línea = `quantity × materials.current_cost` (sin conversión oculta).

## Roll-up

Fuente de verdad SQL: `public.calculate_product_material_cost(uuid)`  
Fuente TS (tests/UI): `calculateProductMaterialCost(lines)` sobre líneas elegibles.

La BOM **no** almacena costo unitario ni subtotal persistido.  
Única fuente de costo vigente por material: `materials.current_cost`.

### Líneas BOM activas + materiales activos

- Solo se suman líneas con `product_bom_lines.is_active = true` y `materials.is_active = true`.
- No se pueden **agregar** materiales inactivos desde el admin (selector solo activos; server action valida).
- Si un material de la BOM se **desactiva después**, la línea sigue visible con aviso; **no suma** al total hasta reactivar el material o quitar la línea.

### Unicidad (sin variantes)

Índice parcial único `(product_id, material_id) WHERE product_variant_id IS NULL`:  
un solo registro por par producto–material a nivel producto (incluye líneas desactivadas); reactivar actualiza la fila existente.

### Cantidad

Constraint DB: `quantity > 0` en `product_bom_lines`, además de validación en `bom.ts`.

## Historical BOM / Product Cost Snapshots (deuda futura)

**No implementado en Gate 2A.**

Multiplicar una BOM actual por `material_cost_history` **no** reconstruye el costo histórico exacto del producto si cambió la **composición o las cantidades** de la BOM. Ejemplo: el 01/10 la BOM tenía 100 hojas y el 15/10 pasó a 120; aunque conozcamos el costo de cada hoja en cada fecha, hace falta saber **qué BOM vigía** en cada momento.

Antes de reporting histórico real hace falta al menos una de:

- versionado / historial de BOM;
- `effective_from` / `effective_to` por línea;
- snapshots en `product_cost_history` (u equivalente auditable).

## Gate 2B (pendiente)

Integrar `machines` y `labor_rates` cuando exista modelo de operaciones por producto.
