# Gate 3A — Pricing foundation

## Estado

**GATE 3A — GREEN / CLOSED** (2026-10-01)

---

## Semántica fiscal definitiva (Opción A)

| Concepto | Semántica Gate 3A |
|----------|-------------------|
| `products.price` | **Precio final de catálogo** (lo que ve el cliente en checkout; **no** se suma IVA en checkout). |
| Costo Gate 2 (`total_cost`) | **Neto operativo** (materiales + máquinas + MO); sin motor fiscal AFIP. |
| `business_cost_settings.tax_percentage` | **Impuesto de referencia** sobre el **neto sugerido** para simular/desglosar en admin; no altera `products.price`. |
| Margen / recargo **actuales** | Sobre **precio neto derivado**: `precio_final / (1 + tax_rate)`. |
| Margen / precio **objetivo** | Sobre **neto**: `neto_objetivo = costo / (1 − margen_sobre_venta)`; luego `final = neto + neto×tax`. |

Invariante **Caso J**: si `precio_actual == precio_sugerido` (misma config), entonces `actual_margin_on_sale ≈ target_margin_on_sale` (tolerancia redondeo).

`products.cost_price` sigue **manual**; no se sincroniza con Gate 2 ni con el sugerido.

---

## Markup vs margen

- **Margen sobre venta:** `(precio_neto − costo) / precio_neto`
- **Recargo sobre costo:** `(precio_neto − costo) / costo`

`default_profit_margin_percentage` + `applyMargin` en `cost-engine` = **legacy markup**, no margen sobre venta.

---

## Redondeo

`none` | `integer` | `ten` | `hundred` en `business_cost_settings.suggested_price_rounding_rule`.

---

## Snapshots

`product_cost_snapshots`: captura **manual** del desglose Gate 2 (botón admin). No automático por request. Historial de pricing adoptado → Gate 3B.

---

## Cierre operativo

| Item | Evidencia |
|------|-----------|
| PR | [#22](https://github.com/tiendapronet2026-wq/tienda-web/pull/22) → `master` (`710b409`) |
| Fix semántica | `3992bd0` — margen actual sobre neto derivado |
| CI PR | `36914463702` success |
| CI merge | `36914683015` (post-merge) |
| Migración Git | `20261002180000_tiendapro_pricing_foundation_g3a.sql` |
| Migración remota | `20261001192905` — `tiendapro_pricing_foundation_g3a` (mismo SQL; versión MCP) |
| RPC | `calculate_product_pricing` + `is_admin()` |
| Tests | 99 Vitest (incl. caso J) |

### Seguridad

| Contexto | Resultado |
|----------|-----------|
| anon RPC | HTTP **401** permission denied |
| no-admin RPC | **Acceso denegado** (SQL regresión) |
| admin | OK |
| `product_cost_snapshots` | RLS admin; anon sin acceso |

### Smoke productivo (TEST G2B reutilizado)

- Costo producción **4200** con BOM/procesos reactivados temporalmente.
- Caso D: precio 80 → `below_cost`, `unit_result = -4120`.
- Caso J: margen actual **0.40** con tax 21 % y precio = sugerido.
- Datos TEST desactivados tras smoke.

### Precedencia margen objetivo

1. `p_target_margin_percent` en RPC (si se pasa)
2. `products.target_sale_margin_percent`
3. `business_cost_settings.default_target_sale_margin_percent`
4. `0`

---

## Limitaciones / deuda

- No motor AFIP; `tax_percentage` es referencia admin.
- Si `tax_percentage = 0`, precio final = neto para análisis (coherente con tienda sin desglose).
- Gate 3B: historial de precio adoptado, canales, comisiones.

## Siguiente gate

**Gate 3B** — no iniciado.
