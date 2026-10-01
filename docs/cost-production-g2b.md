# Gate 2B — Procesos productivos + roll-up completo

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

## Estado

**En desarrollo** — migración `20261001193000_tiendapro_production_costs_g2b.sql` (aplicar en remoto solo tras CI verde + PR).
