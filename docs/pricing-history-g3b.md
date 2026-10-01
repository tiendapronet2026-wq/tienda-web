# Gate 3B — Historial y adopción controlada de precios

## Estado

**En desarrollo** — rama `feat/tiendapro-pricing-history-g3b`, migración `20261002193000_tiendapro_pricing_history_g3b.sql`.

---

## Preflight

### REUTILIZADO

| Pieza | Uso |
|-------|-----|
| `calculate_product_pricing` (3A) | Recalcular en servidor al adoptar |
| `calculate_product_production_cost` (2B) | Costo congelado vía pricing RPC |
| Semántica fiscal 3A | Precio final catálogo; margen sobre neto derivado |
| `product_cost_snapshots` (3A) | Captura manual; **no** duplicada en cada adopción |
| `cost_audit_log` | Auditoría de costos/materiales; distinto de pricing |
| `products.price` / `compare_at_price` | Checkout usa `price`; `compare_at_price` solo visual manual |
| `updateProduct` | Edición general; **no** reemplaza adopción auditada |
| Patrón `idempotency_key` (Gate 1) | Historial de pricing |

### FALTANTE (este gate)

- Tabla `product_pricing_history` (append-only)
- RPC atómico `adopt_product_pricing`
- UI: adoptar sugerido / otro precio + historial
- Tests + regresión seguridad

### RIESGOS

| Riesgo | Mitigación |
|--------|------------|
| Editar precio solo con `updateProduct` sin historial | Adopción explícita vía RPC; documentar |
| `compare_at_price` como promo falsa | No tocar en adopción |
| Doble submit | `idempotency_key` único por intento |
| Confianza en datos del cliente | Servidor recalcula todo |

### MODELO MÍNIMO

`product_pricing_history` almacena snapshot económico completo en la fila (sin FK obligatoria a `product_cost_snapshots`).

---

## Adopción

RPC `adopt_product_pricing(product_id, adopted_price?, reason?, idempotency_key?)`:

1. `is_admin()`
2. Idempotencia → replay
3. `calculate_product_pricing` + `FOR UPDATE` producto
4. Insert historial
5. `UPDATE products.price`
6. Una transacción

`p_adopted_price` null → precio sugerido actual.

---

## Siguiente gate

Gate 3C+ (canales, comisiones, automatización) — no iniciado.
