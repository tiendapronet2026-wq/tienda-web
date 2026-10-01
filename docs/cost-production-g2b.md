# Gate 2B — Procesos productivos + roll-up completo

## Estado

**GATE 2B — GREEN / CLOSED** (2026-10-01)

## Preflight (fuentes canónicas)

| Recurso | Campo canónico costo/hora | Notas |
|---------|---------------------------|--------|
| Máquina | `machines.total_cost_per_hour` | Trigger `set_machine_total_cost` suma **energía + mantenimiento + depreciación + adicionales**. Gate 2B **no** suma kWh aparte. |
| Mano de obra | `labor_rates.cost_per_hour` | Tarifa interna por hora. |
| Materiales | `calculate_product_material_cost` (Gate 2A) | BOM × `materials.current_cost`. |

## Modelo

- `product_process_steps`: operación (`name`, `position`, `batch_size` > 0).
- `product_process_resources`: filas `machine` o `labor` (mutuamente excluyentes por constraint), `run_minutes` (por unidad), `setup_minutes` (por lote del paso).

### Setup vs run

- **Run:** `(run_minutes / 60) × costo_hora` por unidad de producto.
- **Setup:** `(setup_minutes / 60) × costo_hora / batch_size` por unidad.

## Roll-up

RPC admin-only `calculate_product_production_cost(product_id)` → JSON:

- `materials_cost`, `machine_cost`, `labor_cost`, `production_cost`, `total_cost`

Requiere `is_admin()` (mismo aprendizaje que Gate 2A).

Recursos o máquinas/tarifas **inactivos** no suman; relaciones conservadas.

## Histórico (deuda)

Cambios en BOM, tiempos, `batch_size`, tarifas o `total_cost_per_hour` impiden reconstruir costo pasado sin versionado/snapshots (igual que Gate 2A).

`products.cost_price` **no** se sincroniza automáticamente (fuera de Gate 2B).

---

## Cierre operativo

### Merge / CI

| Item | Evidencia |
|------|-----------|
| PR | [#21](https://github.com/tiendapronet2026-wq/tienda-web/pull/21) mergeado a `master` |
| Merge commit | `e7101f3` |
| CI post-merge | GitHub Actions run `36910350272` — **success** (~54s validate) |

### Deploy

- Despliegue de `master` en Vercel (política habitual, sin preview adicional).
- Producción `https://www.tiendapro.net` — ficha admin producto muestra **Procesos productivos** y **Costo total calculado** (smoke UI en producto TEST, ver abajo).

### Migración Git

- Archivo canónico repo: `supabase/migrations/20261001193000_tiendapro_production_costs_g2b.sql`
- **No** se re-ejecutó SQL de negocio en el cierre (esquema ya vigente en remoto).

### Migration history (Supabase remoto)

Investigación en `supabase_migrations.schema_migrations`:

| Versión remota | Nombre | Contenido |
|----------------|--------|-----------|
| `20261001185129` | `tiendapro_production_costs_g2b` | **No-op**: `stmt0_len = 64`, solo comentario placeholder (apply fallido). **Sin DDL.** |
| `20261001185200` | `tiendapro_production_costs_g2b_schema` | Esquema real Gate 2B (`stmt0_len ≈ 8164`, equivalente al archivo Git `20261001193000`). |

**Reconciliación:**

- El registro vacío **no** creó tablas ni funciones; el esquema productivo proviene exclusivamente de `_g2b_schema`.
- Git usa versión `20261001193000` (misma lógica que `_schema`); en remoto el versionado difiere por el apply MCP en dos pasos.
- **No** se eliminaron filas de `schema_migrations` manualmente (riesgo de desalinear `db push`).
- Para alinear CLI en el futuro sin re-aplicar DDL: usar el mecanismo soportado  
  `supabase migration repair 20261001193000 --status applied`  
  contra el proyecto enlazado, **solo** tras verificar que el esquema coincide (ya verificado en cierre). El stub `20261001185129` puede quedar documentado como no-op histórico.

### Sin doble conteo energético

Función remota `set_machine_total_cost()`:

```text
total_cost_per_hour = energy + maintenance + depreciation + additional
```

Roll-up Gate 2B usa únicamente `machines.total_cost_per_hour` en `_process_resource_unit_cost` / `calculate_product_production_cost`.

Evidencia máquina TEST: `energy_cost_per_hour = 1200`, componentes restantes `0`, `total_cost_per_hour = 1200`.

---

## Smoke productivo (TEST G2B)

Entidades (UUID fijos para trazabilidad; **desactivadas** al final del smoke):

| Entidad | ID |
|---------|-----|
| Producto | `a0b1c2d3-e4f5-4678-9abc-def0123402b1` |
| Máquina | `a0b1c2d3-e4f5-4678-9abc-def0123402b2` |
| MO | `a0b1c2d3-e4f5-4678-9abc-def0123402b3` |
| Material BOM | `a0b1c2d3-e4f5-4678-9abc-def0123402b4` |
| Paso | `TEST G2B - Producción máquina`, `batch_size = 1` |

### Máquina (run 30 min @ $1.200/h)

- RPC / helper: `machine_cost = 600`, `_process_resource_unit_cost(1200, 30, 0, 1) = 600`

### Mano de obra (run 15 min @ $2.000/h)

- `labor_cost = 500`; con máquina: `production_cost = 1100`

### Setup + batch

- `_process_resource_unit_cost(1200, 0, 30, 100) = 6` por unidad (**no** $600/unidad)

### Roll-up completo

- `materials_cost = 3100`, `machine_cost = 600`, `labor_cost = 500`, `production_cost = 1100`, **`total_cost = 4200`**
- UI admin (mismo producto): subtotal paso $1.100, **Costo total calculado: $ 4.200,00**

### Actualización dinámica

- MO `2000 → 2400` (15 min): `labor_cost = 600`, `total_cost = 4300` sin editar proceso.
- Máquina `energy 1200 → 1320` (30 min run): `machine_cost = 660`, `total_cost = 4260`; restaurado a 1200 tras prueba.

### Recurso inactivo

- `product_process_resources.is_active = false` en recurso MO: relación conservada; `labor_cost = 0`, `total_cost = 3700` (solo materiales + máquina).

### Seguridad `calculate_product_production_cost`

| Contexto | Resultado |
|----------|-----------|
| **anon** (REST) | HTTP **401** `permission denied for function calculate_product_production_cost` (sin importes) |
| **authenticated no-admin** | SQL regresión `supabase/tests/isolated/product_process_g2b_rpc_admin.sql` — **Acceso denegado** |
| **admin** | RPC OK con desglose; UI admin OK |

### Limpieza post-smoke

Producto, BOM, pasos, recursos, máquina, tarifa y material TEST → `is_active = false` (sin DELETE destructivo).

---

## Tests automatizados (repo)

- Vitest `src/lib/cost-engine.test.ts` — casos A–E, I (incluidos en CI).
- Regresión SQL aislada: `supabase/tests/isolated/product_process_g2b_rpc_admin.sql`.

## Siguiente gate

Pricing, margen, impuestos, `cost_price` / snapshots — **Gate 3+** (no iniciado).
