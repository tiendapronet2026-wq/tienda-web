# Gate 3D — Precio objetivo por canal

## Estado

**GATE 3D — GREEN / CLOSED** (2026-10-02)

PR [#25](https://github.com/tiendapronet2026-wq/tienda-web/pull/25) mergeado en `master`. Migraciones remotas aplicadas.

---

## Preflight

### REUTILIZADO

Gate 3C (perfiles, forward RPC, motor TS), Gate 2B (`total_cost`), Gate 3A (tax + redondeo), `products.price` solo lectura, Gate 3B sin adopción automática.

### FALTANTE (entregado)

`target_channel_margin_percent`, `calculateRequiredChannelPrice`, RPC `calculate_product_channel_target_price`, UI «Precio objetivo del canal», tests A–L, SQL M.

### CONFLICTOS SEMÁNTICOS

**Margen de contribución del canal** (3D) ≠ **margen sobre venta objetivo** Gate 3A. Break-even 3C = target margin **0 %** con la misma fórmula inversa.

---

## Fórmula inversa

`P = (C + F) / (((1 - m) / (1 + t)) - r)`  
Validación forward (Caso J canal): margen resultante ≈ `m` tras redondeo.

---

## Smoke productivo

Perfil `test-g3c-canal` (8 % / 3 % / envío 500): target **0** alinea con `break_even_final_price`; target **40 %** con propiedad inversa; `products.price` intacto. Perfil desactivado; producto TEST restaurado.

---

## Git ↔ Supabase

| Git | Remoto |
|-----|--------|
| `20261002220000_tiendapro_channel_target_price_g3d.sql` | `tiendapro_channel_target_price_g3d` + `tiendapro_channel_target_price_g3d_core` (apply MCP en dos pasos; contenido Git unificado) |

---

## Siguiente gate

**Gate 3E+** (adopción explícita por canal, integraciones) — **no iniciado**.
