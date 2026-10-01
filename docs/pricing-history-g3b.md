# Gate 3B — Historial y adopción controlada de precios

## Estado

**GATE 3B — GREEN / CLOSED** (2026-10-01)

PR [#23](https://github.com/tiendapronet2026-wq/tienda-web/pull/23) mergeado en `master` (`1c56f39`). Migración remota aplicada.

---

## Precio de catálogo: creación vs edición vs adopción

| Momento | ¿Puede cambiar `products.price`? | Mecanismo |
|---------|----------------------------------|-----------|
| **Alta de producto** | Sí (precio inicial) | `createProduct` / formulario «Nuevo producto» |
| **Edición general** | **No** | `updateProduct` ignora `price` (`stripPriceFromProductUpdatePayload`); UI edición: precio solo lectura con aviso hacia «Precio y rentabilidad» |
| **Cambio posterior** | Sí, solo con auditoría | RPC `adopt_product_pricing` (UI «Adoptar precio») |

Únicos `UPDATE` de `products.price` en aplicación post-Gate 3B: **ninguno** en `updateProduct`; solo el RPC de adopción (más el `INSERT` inicial en creación).

Regresión unitaria: payload de update sin campo `price` aunque el cliente envíe `150` (`products.price-guard.test.ts`).

---

## Adopción (`adopt_product_pricing`)

Parámetros: `product_id`, `adopted_price?`, `reason?`, `idempotency_key?`.

1. `is_admin()` — si no, `Acceso denegado`.
2. Replay idempotente si ya existe `(product_id, idempotency_key)`.
3. `SELECT … FOR UPDATE` del producto; `calculate_product_pricing` en servidor.
4. `INSERT` en `product_pricing_history` (costos y sugerido **congelados** en la fila).
5. `UPDATE products.price` con precio adoptado.
6. **Una sola transacción** (función PL/pgSQL).

`p_adopted_price` null → se adopta el **precio sugerido** actual del motor 3A.

**Adopción manual:** `p_adopted_price` distinto del sugerido; margen/markup en historial se recalculan sobre el **precio final adoptado** (semántica 3A: neto = `final / (1 + tax_rate)`).

---

## Tabla `product_pricing_history`

- Append-only desde la app (sin política de `INSERT`/`UPDATE`/`DELETE` para `authenticated`; escritura solo vía `SECURITY DEFINER`).
- RLS: `SELECT` solo admin; `anon` denegado en todas las operaciones.
- Índice único parcial: `(product_id, idempotency_key)` donde `idempotency_key` no es null.

---

## Atomicidad

Invariante: no debe existir precio nuevo sin fila de historial de esa adopción, ni historial de una adopción que no haya actualizado `products.price`. El RPC hace insert + update en la misma función/transacción.

---

## Idempotencia

Misma `idempotency_key` y mismo producto → respuesta `idempotent_replay: true`, una sola fila, un solo cambio efectivo de precio.

---

## Histórico congelado

`production_cost`, desglose de costos, `suggested_price` y parámetros fiscales en la fila reflejan el **momento de la adopción**. Cambios posteriores en materiales/BOM **no** alteran filas ya insertadas (smoke `g3b-smoke-c`).

---

## Checkout

Catálogo y checkout usan `products.price` como **precio final** (Gate 3A); **no** se vuelve a sumar impuesto en checkout (`place-order.ts`).

---

## Seguridad

| Rol | `adopt_product_pricing` | `product_pricing_history` |
|-----|-------------------------|---------------------------|
| `anon` | Sin `EXECUTE` (revoke PUBLIC/anon) | RLS bloquea |
| `authenticated` no admin | `Acceso denegado` | Sin filas visibles |
| Admin | OK | Lectura OK |

Función: `SECURITY DEFINER`, `search_path = public`, `is_admin()` al inicio.

---

## Smoke productivo (TEST G2)

Producto: `370b38c8-f486-44e5-9375-75ba97d19541` (`TEST G2 - Producto 100 hojas`).

| Caso | Evidencia |
|------|-----------|
| **A — adoptar sugerido** | `g3b-smoke-a2`: `previous=150`, `suggested=200`, `adopted=200`, `production_cost≈82.645` (BOM temporal para sugerido 200 con margen 50% e IVA ref. 21%) |
| **B — manual 190** | `g3b-smoke-b`: `adopted=190` con sugerido del motor en fila |
| **C — costo congelado** | `g3b-smoke-c`: `production_cost` inmutable tras subir `materials.current_cost` |
| **D — idempotencia** | `g3b-smoke-d`: una fila, replay `idempotent_replay` |
| **E — bypass** | Update sin `price` deja catálogo; adopción `g3b-smoke-e` → `200` |
| **F — checkout** | Contrato 3A + lectura de `product.price` en checkout (sin doble impuesto) |
| **G — seguridad** | No-admin `4444…` y rol `anon` bloqueados en RPC |

Filas `g3b-smoke-*` conservadas como evidencia. Producto y materiales TEST **desactivados** / costos restaurados tras smoke.

---

## Git ↔ Supabase

| Git | Remoto (MCP) |
|-----|----------------|
| `20261002193000_tiendapro_pricing_history_g3b.sql` | `20261001202257` — `tiendapro_pricing_history_g3b` |

Mismo patrón de timestamp que Gate 3A (`20261001192905` remoto vs `20261002180000` Git).

---

## CI / deploy

- PR #23 CI GREEN (incl. bypass `0715f32`).
- Post-merge `master` CI GREEN (`36921190044`).
- Deploy: pipeline habitual de `master` (Vercel); UI admin: **Precio y rentabilidad**, **Adoptar precio**, **Historial de precios**.

---

## Riesgos residuales

- `compare_at_price` sigue editable en formulario general (solo promo visual; fuera de adopción).
- `products.cost_price` manual no sincronizado con Gate 2 (igual que 3A).

---

## Siguiente gate

**Gate 3C** (rentabilidad por canal) — ver `docs/pricing-channel-g3c.md`.
