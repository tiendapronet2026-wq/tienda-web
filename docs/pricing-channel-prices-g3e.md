# Gate 3E — Precios reales por canal + adopción controlada

## Estado

**EN CURSO** — implementación en rama `feat/tiendapro-channel-prices-g3e`.

---

## Preflight

### REUTILIZADO

- `products.price` como precio general/default del catálogo.
- Gate 3B `product_pricing_history` / `adopt_product_pricing` (solo catálogo).
- `channel_cost_profiles`, RPC 3C `calculate_product_channel_profitability`, RPC 3D `calculate_product_channel_target_price`.
- `is_admin()`, RLS admin, patrón idempotencia Gate 3B.
- Checkout y órdenes sin cambios (no leen precio por canal).

### FALTANTE (entregado en rama)

- Tablas `product_channel_prices`, `product_channel_price_history`.
- RPC `adopt_product_channel_price`, `revert_product_channel_price`, helper `effective_channel_final_price`.
- Server actions + UI adopción en producto admin.
- Tests TS fallback + SQL escenarios/seguridad.

### CONFLICTOS

- Gate 3B modifica `products.price`; Gate 3E **no**.
- Sin override activo → fallback `products.price` (no copia masiva a filas).

### MODELO MÍNIMO

Una fila canónica `(product_id, channel_cost_profile_id)` en `product_channel_prices`; historial append-only con snapshot económico e `idempotency_key`.

---

## Fallback

`effective_channel_final_price(product, profile)` = override activo si existe, si no `products.price`.

---

## Git ↔ Supabase

| Git | Remoto (pendiente apply) |
|-----|--------------------------|
| `20261002230000_tiendapro_channel_prices_g3e.sql` | `tiendapro_channel_prices_g3e` |

---

## Siguiente gate

Activar precio por canal en checkout / integraciones — **no iniciado (3F+)**.
