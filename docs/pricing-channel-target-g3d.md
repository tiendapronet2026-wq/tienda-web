# Gate 3D — Precio objetivo por canal

## Estado

**En desarrollo** — rama `feat/tiendapro-channel-target-pricing-g3d`, migración `20261002220000_tiendapro_channel_target_price_g3d.sql`.

---

## Preflight

### REUTILIZADO

| Pieza | Uso |
|-------|-----|
| `channel_cost_profiles` + RPC 3C | Perfil, fees, fijos, forward |
| `channel-profitability-engine` | Contribución, margen canal, break-even unificado |
| `calculate_product_production_cost` (2B) | Costo `C` |
| Semántica tax 3A | `net = P/(1+t)` |
| `target_sale_margin_percent` (3A) | **No** usado en 3D (etiquetas distintas) |
| `products.price` / Gate 3B | Solo lectura para gap; sin adopción automática |
| `_pricing_round_suggested` (3A) | Redondeo del precio requerido |

### FALTANTE (este gate)

- Columna `target_channel_margin_percent` en perfil
- Fórmula inversa + `calculateRequiredChannelPrice` (TS)
- RPC `calculate_product_channel_target_price`
- UI «Precio objetivo del canal»
- Tests A–M + SQL seguridad

### CONFLICTOS SEMÁNTICOS

| Concepto | Resolución |
|----------|------------|
| Margen Gate 3A vs 3D | 3A = comercial antes de canal; 3D = **contribución sobre venta neta** después de perfil |
| Break-even 3C | Caso `target margin = 0` de la misma fórmula |
| Promos | Solo vía precio simulado en 3C; 3D calcula precio necesario |

### MODELO MÍNIMO

`P = (C+F) / (((1-m)/(1+t)) - r)` con validación forward Gate 3C (Caso J canal).

---

## Siguiente gate

Gate 3E+ (adopción explícita de precio por canal, integraciones) — no iniciado.
