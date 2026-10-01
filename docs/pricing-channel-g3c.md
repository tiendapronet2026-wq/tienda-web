# Gate 3C — Rentabilidad por canal

## Estado

**GATE 3C — GREEN / CLOSED** (2026-10-01)

PR [#24](https://github.com/tiendapronet2026-wq/tienda-web/pull/24) mergeado en `master` (`658576f`). Migración remota aplicada.

---

## Preflight

### REUTILIZADO

| Pieza | Uso |
|-------|-----|
| `products.price` (3A) | Precio final de catálogo por defecto |
| `business_cost_settings.tax_percentage` | Venta neta = `final / (1 + tax)` |
| `calculate_product_production_cost` (2B) | `total_cost` unitario |
| `is_admin()` + RPC `SECURITY DEFINER` | Perfiles y simulación |
| Checkout / `orders` / `payments` | Sin cambios; no modelan comisiones de canal |

### FALTANTE (entregado en 3C)

`channel_cost_profiles`, `calculate_product_channel_profitability`, motor TS, admin UI, tests A–L, adapter M&M read-only.

### CONFLICTOS SEMÁNTICOS

Canal ≠ cobro → **perfil único**. `orders.shipping_cost` ≠ envío absorbido. Promos solo vía `final_price_override`. Sin historial de simulaciones (3B sigue siendo historial de precio).

---

## Modelo de perfiles

Tabla `channel_cost_profiles`: % canal, % cobro, fijos por pedido (fijo, envío absorbido, otros), `default_units_per_order`, `is_active`. Sin columnas por proveedor (MP/ML).

RLS: admin CRUD; anon y no-admin sin acceso.

---

## Semántica económica

- Fees **variables** sobre precio final `P`.
- Fees **fijos** ÷ `units_per_order`.
- `unit_contribution = net_sales_revenue − production_cost − channel_cost_per_unit`.
- **No** se llama “ganancia neta”.
- `channel_margin = unit_contribution / net_sales_revenue` (si neto > 0).
- `return_on_production_cost` aparte, etiquetado en UI.

---

## Break-even

`P = (production + f_unit) / ((1/(1+t)) − r)` con `r = fee_canal + fee_cobro`. Si denominador ≤ 0 → perfil inviable (UI lo muestra).

---

## Simulación

RPC/UI: `final_price_override`, `units_per_order` opcionales. **No** modifica `products.price`, perfiles ni `product_pricing_history`.

---

## Admin

- `/admin/perfiles-rentabilidad` — CRUD perfiles.
- Ficha producto — **Rentabilidad por canal** (selector + simulación).

---

## Seguridad

| Rol | Perfiles | RPC |
|-----|----------|-----|
| anon | Bloqueado | Sin EXECUTE |
| authenticated no-admin | Bloqueado | `Acceso denegado` |
| admin | CRUD | OK |

Regresión: `supabase/tests/isolated/product_channel_profitability_g3c_rpc.sql`.

---

## Tests

Vitest `channel-profitability-engine.test.ts`: casos **A–K**. SQL: **L**.

---

## Smoke productivo

Perfil `TEST G3C - Canal` (`code=test-g3c-canal`): canal 8 %, cobro 3 %, envío 500/pedido, 1 u/pedido.

Producto TEST `370b38c8-…`: RPC admin validó fees 800/300, override 9000 con catálogo 10000, no-admin bloqueado.

Perfil **desactivado**; producto restaurado `price=100`, `is_active=false`.

---

## Git ↔ Supabase

| Git | Remoto |
|-----|--------|
| `20261002210000_tiendapro_channel_profitability_g3c.sql` | `20261001234952` — `tiendapro_channel_profitability_g3c` |

---

## M&M

`mm-channel-profitability-adapter.ts` — solo lectura; sin escritura de perfiles ni precios.

---

## Riesgos residuales

- Perfiles son manuales (sin APIs de marketplaces).
- Costos empresariales fuera del modelo (estructura, ads, impuestos reales).
- `cost_price` / `compare_at_price` sin cambios (deuda previa).

---

## Siguiente gate

**Gate 3D+** (integraciones de pago/marketplace, promociones formales, precios por canal) — **no iniciado**.
