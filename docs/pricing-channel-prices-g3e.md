# Gate 3E — Precios reales por canal + adopción controlada

## Estado

**GATE 3E — GREEN / CLOSED** (2026-10-02)

PR [#26](https://github.com/tiendapronet2026-wq/tienda-web/pull/26) mergeado en `master`. Migración remota `tiendapro_channel_prices_g3e` aplicada.

---

## Preflight

### REUTILIZADO

- `products.price` catálogo general; Gate 3B solo catálogo; perfiles + RPC 3C/3D; `is_admin()` / RLS; checkout sin cambios.

### FALTANTE (entregado)

- `product_channel_prices`, `product_channel_price_history`, `adopt_product_channel_price`, `revert_product_channel_price`, `effective_channel_final_price`.
- Actions + UI adopción; tests TS + SQL; adapter M&M read-only extendido.

### CONFLICTOS

- 3B escribe `products.price`; 3E **no**. Fallback sin override → `products.price`.

### MODELO

Una fila `(product_id, channel_cost_profile_id)`; historial append-only + idempotencia por `(product, profile, key)`.

---

## Fallback

Sin override activo → `effective_channel_final_price` = `products.price`.

---

## Smoke productivo

Producto TEST `370b38c8-f486-44e5-9375-75ba97d19541`, perfil `test-g3c-canal`: adopt objetivo (idempotencia), `products.price` intacto, revert a general, perfil TEST desactivado.

---

## Git ↔ Supabase

| Git | Remoto |
|-----|--------|
| `20261002230000_tiendapro_channel_prices_g3e.sql` | `tiendapro_channel_prices_g3e` (`20261002002453`) |

---

## Siguiente gate

Usar precio por canal en checkout / integraciones — **no iniciado (3F+)**.
