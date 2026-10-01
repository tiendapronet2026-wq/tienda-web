# Gate 3C — Rentabilidad por canal

## Estado

**En desarrollo** — rama `feat/tiendapro-channel-profitability-g3c`, migración `20261002210000_tiendapro_channel_profitability_g3c.sql`.

---

## Preflight (obligatorio)

### REUTILIZADO

| Pieza | Uso Gate 3C |
|-------|-------------|
| `products.price` (3A) | Precio final de catálogo por defecto en simulación |
| `business_cost_settings.tax_percentage` (3A) | `net_sales_revenue = final / (1 + tax)` |
| `calculate_product_production_cost` (2B) | `production_cost` / `total_cost` por unidad |
| `netPriceFromTaxInclusiveFinal` (TS) / misma fórmula en SQL | Semántica fiscal 3A |
| `is_admin()` + patrón RPC `SECURITY DEFINER` (2A/3A/3B) | RPC y RLS admin-only |
| `orders.shipping_cost`, `payments.provider` (legacy checkout) | Solo registro de pedido; **no** modelo de comisión por canal |
| Checkout `place-order` | Lee `product.price`; **sin cambios** en Gate 3C |

### FALTANTE (este gate)

- Tabla `channel_cost_profiles` (perfiles económicos completos)
- RPC `calculate_product_channel_profitability`
- Motor TS `channel-profitability-engine` + tests A–K
- Admin: `/admin/perfiles-rentabilidad` + sección producto «Rentabilidad por canal»
- Regresión SQL seguridad RPC

### CONFLICTOS SEMÁNTICOS

| Tema | Resolución |
|------|------------|
| Canal vs medio de cobro | Un solo **perfil** agrupa ambos (% canal + % cobro + fijos por pedido) |
| `orders.shipping_cost` | Es lo que paga el cliente en checkout hoy; **no** es «envío absorbido» del negocio |
| `payments.provider = mercadopago` | Identificador de integración futura; **no** tarifa automática |
| Promociones / descuentos | Solo vía `final_price_override` en simulación; sin doble descuento |
| `product_pricing_history` (3B) | Sigue siendo historial de **decisiones de precio**; 3C no persiste simulaciones |

### MODELO MÍNIMO PROPUESTO

`channel_cost_profiles` — proveedor-independiente, sin columnas MP/ML.

Simulación: `calculate_product_channel_profitability(product_id, profile_id, final_price_override?, units_per_order?)` → JSON con contribución unitaria, margen del canal, break-even.

---

## Fórmulas (resumen)

- Fees variables sobre **precio final** `P`.
- Fijos por pedido ÷ `units_per_order`.
- `unit_contribution = net_sales_revenue − production_cost − channel_cost_per_unit`.
- Break-even: `P = (production + f_unit) / ((1/(1+t)) − r)` con `r = fee_canal + fee_cobro`; inviable si denominador ≤ 0.

---

## Siguiente gate

Gate 3D+ (integraciones, promociones formales, automatización) — no iniciado.
