# Gate 3A — Pricing foundation

## Estado

**En desarrollo** — rama `feat/tiendapro-pricing-foundation-g3a`, migración `20261002180000_tiendapro_pricing_foundation_g3a.sql`.

---

## Preflight

### REUTILIZADO

| Pieza | Uso Gate 3A |
|-------|-------------|
| `calculate_product_production_cost` (Gate 2B) | `production_cost` = `total_cost` canónico |
| `business_cost_settings.tax_percentage` | Tasa referencia sobre **neto sugerido** (no checkout) |
| `business_cost_settings.currency` | Formato ARS en admin |
| `products.price` | Precio actual de catálogo/checkout |
| `products.cost_price` | Costo manual heredado (solo lectura comparativa) |
| `products.compare_at_price` | Precio anterior / referencia visual (sin motor 3A) |
| Admin ficha producto | Sección nueva **Precio y rentabilidad** |
| Patrón RPC + `is_admin()` | `calculate_product_pricing` |
| `roundCurrency` (cost-engine) | Base numérica estable |

### FALTANTE (cubierto en 3A)

- Motor puro `pricing-engine.ts` (margen vs markup)
- RPC `calculate_product_pricing`
- `products.target_sale_margin_percent`
- `business_cost_settings.default_target_sale_margin_percent`, `suggested_price_rounding_rule`
- Tabla `product_cost_snapshots` + captura manual
- Tests A–I + regresión RPC admin
- Adapter lectura `mm-pricing-adapter.ts`

### SEMÁNTICA ACTUAL DE `cost_price`

Campo opcional en formulario admin (“Costo”). **Manual**, no se sincroniza con Gate 2. Gate 3A lo muestra como referencia; el costo operativo es el **calculado**.

### SEMÁNTICA ACTUAL DE PRECIO DE VENTA

`products.price` es el importe usado en carrito, checkout y vitrina (`formatPrice`). **No** se aplica `tax_percentage` al cobrar: el impuesto en settings es referencia para pricing sugerido, no un motor fiscal de tienda.

### IMPUESTOS EXISTENTES

`business_cost_settings.tax_percentage` (0–100). Gate 3A: `tax_amount = net_price × (tax_percentage/100)`, `suggested_price = net + tax` (luego redondeo). Sin percepciones/retenciones/AFIP.

### RIESGOS

| Riesgo | Mitigación |
|--------|------------|
| `applyMargin` / `default_profit_margin_percentage` son **markup** legacy | Nuevo campo `default_target_sale_margin_percent`; UI renombra legacy |
| Confundir margen y markup en UI | Etiquetas “Margen sobre venta” / “Recargo sobre costo” |
| `cost_price` vs costo calculado | No auto-sync; documentado |
| Histórico BOM/procesos | Snapshots de costo parciales; no reconstrucción total |
| Variantes | Fuera de alcance; BOM `product_variant_id` reservado |

---

## Modelo pricing

- **Costo:** `total_cost` de Gate 2.
- **Margen sobre venta objetivo:** `net = costo / (1 − margen)`.
- **Impuesto:** sobre neto sugerido (config).
- **Precio sugerido:** neto + impuesto + redondeo.
- **No** se actualiza `products.price` automáticamente.

## Snapshots

`product_cost_snapshots`: captura **manual** del desglose Gate 2. Pricing histórico completo → Gate 3B (diseño).

## Siguiente gate

3B: historial de pricing adoptado, automatización, canales — no iniciado.
