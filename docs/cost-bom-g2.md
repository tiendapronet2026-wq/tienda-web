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

Fuente de verdad SQL: `public.calculate_product_material_cost(uuid)` — **solo admin** (`is_admin()` dentro del RPC; `SECURITY DEFINER`).  
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

---

## GATE 2A — GREEN / CLOSED (2026-10-01)

**Alcance cerrado:** BOM por producto (sin variantes), roll-up de costo de materiales, admin en ficha de producto. **Gate 2 completo** sigue pendiente de **2B** (máquinas, mano de obra).

### Entrega Git / CI

| Item | Valor |
|------|--------|
| PR | [#20](https://github.com/tiendapronet2026-wq/tienda-web/pull/20) — merge `12f267c` en `master` |
| CI post-merge | GitHub Actions run `36901769301` — success |
| Gate 1 en `master` | Sin cambios funcionales en este cierre (`9430056` documental previo) |

### Supabase producción (`dnptsudsxrcamtxfiszh`)

Migraciones aplicadas (alineadas con repo; **no re-ejecutar** en deploy):

- `tiendapro_product_bom_g2`
- `tiendapro_product_bom_g2_rollup_active_materials`
- `tiendapro_product_bom_g2_rpc_admin_guard` — exige `is_admin()` en `calculate_product_material_cost` (SECURITY DEFINER sin guardia filtraba costos a authenticated no-admin; corregido en cierre 2A)

### Deploy

UI BOM visible en producción (`https://www.tiendapro.net/admin/productos/[id]`) tras deploy de `master` post-merge (Vercel automático).

### Smoke productivo (admin, datos `TEST G2 - *`)

| Caso | Resultado |
|------|-----------|
| A — 100× papel @ 20 | UI y RPC: **$2.000** |
| B — +2× tapa @ 300 | **$2.600** |
| C — papel 20→25 sin tocar BOM | **$3.100** (`100×25 + 2×300`) |
| D — cantidad ≤ 0 | CHECK DB `quantity > 0`; UI `min` + server action *«La cantidad debe ser mayor que cero.»* |
| E — anon | REST `product_bom_lines` **401**; RPC sin JWT — denegado |
| E — authenticated no admin | Usuario `test-g2a-nonadmin-prod@example.invalid` (`profiles.role = customer`). REST `product_bom_lines` → **200** cuerpo `[]` (RLS, sin filas visibles). RPC `calculate_product_material_cost` → **400** `P0001` *«Acceso denegado»* (tras `tiendapro_product_bom_g2_rpc_admin_guard`; antes del guard devolvía el roll-up numérico por ser SECURITY DEFINER) |
| E — admin | Flujo completo A–C OK |

**Limpieza:** producto `370b38c8-f486-44e5-9375-75ba97d19541` y materiales `e1d785fb-…` (Papel), `38e448ee-…` (Tapa) **desactivados**; BOM e historial de costos conservados.

### Nota de gate

- **2A:** cerrado.
- **2B:** abierto (mano de obra, máquinas/procesos).
- **Deuda:** histórico/versionado BOM o snapshots de costo producto; variantes; tenant; issue #19.
