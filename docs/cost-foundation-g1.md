# Gate 1 — Fundación de costos (proveedores e insumos)

## Estado: GATE 1 — GREEN / CLOSED

Cierre definitivo: **2026-10-01** (post-merge [PR #18](https://github.com/tiendapronet2026-wq/tienda-web/pull/18)).

| Entrega | Evidencia |
|--------|-----------|
| Merge en `master` | `088ec590b4dc25d9e984cd91bf5c4d4ad640936f` |
| CI `master` | Run [36890820768](https://github.com/tiendapronet2026-wq/tienda-web/actions/runs/36890820768) — success |
| Migración Git | `supabase/migrations/20261001183000_tiendapro_cost_foundation_g1.sql` |
| Migración Supabase | `tiendapro_cost_foundation_g1` (versión remota `20261001153935`, mismo contenido funcional) |
| Smoke admin (producción) | Ver sección *Cierre E2E* |
| Hardening `is_admin()` | Issue [#19](https://github.com/tiendapronet2026-wq/tienda-web/issues/19) (sin cambio en Gate 1) |

### Cierre E2E (admin real, `www.tiendapro.net`)

| Caso | Entrada | Resultado UI / DB |
|------|---------|-------------------|
| TEST RESMA | `TEST - Resma Gate1`, unidad `hoja`, compra 10000 / 500 | `current_cost = 20`, UI «$ 20,00» |
| TEST FILAMENTO | `TEST - Filamento Gate1`, unidad `gramo`, compra 20000 / 1000 | `current_cost = 20`, UI «$ 20,00» |
| Historial | Resma: 0→20 y registro con clave idempotencia | `material_cost_history` coherente (`previous_cost` / `new_cost`) |
| Auditoría | Tras actualizaciones de costo | `cost_audit_log` con `action = cost_updated` |
| Refresh | F5 en ficha filamento | Costo $ 20,00 persistente |
| Idempotencia | Misma operación + `gate1-resma-idem-001` (reintento UI) | Historial **2** filas (inicial + clave); reintentos **no** duplican; auditoría **2** entradas; costo sigue 20; UI éxito sin error engañoso |

**Nota idempotencia:** la primera actualización sin clave y la primera con `gate1-resma-idem-001` son dos operaciones distintas (fila 20→20 con clave). Los reintentos con la clave ya registrada no insertan historial ni auditoría adicional (comportamiento RPC).

### Seguridad revalidada (REST)

- `anon`: lectura tablas de costos — denegado; RPC `update_material_cost` — denegado.
- `authenticated` no admin: materiales — vacío; RPC — «Acceso denegado».
- Admin: flujo UI + RPC operativos.

### Limpieza TEST

- Materiales desactivados vía admin (no DELETE): `3bd02a85-…` (Resma), `5a03f99f-…` (Filamento).
- Historial y `cost_audit_log` conservados (inmutables por diseño).
- Archivos locales `.tmp-*.json` de pruebas REST eliminados del workspace.

### Drift Git ↔ Supabase

- **Solo** diferencia de *timestamp* de migración (`20261001183000` en repo vs `20261001153935` aplicada en remoto). Mismo nombre `tiendapro_cost_foundation_g1`. Sin drift de esquema relevante.

### Riesgos abiertos (no bloquean Gate 2)

| Riesgo | Estado |
|--------|--------|
| Migración antes del merge | **CERRADO** (master + remoto alineados funcionalmente) |
| Tenant en costos (`tenant_id`) | **ABIERTO** — deuda arquitectónica |
| `is_admin()` ejecutable por `anon` | **ABIERTO** — [#19](https://github.com/tiendapronet2026-wq/tienda-web/issues/19); RLS/RPC críticos OK |
| E2E admin real | **CERRADO** |

---

Tienda Pro es el **sistema operativo comercial y productivo** del negocio. La capacidad
SaaS/multi-tenant del código es una característica arquitectónica para escalar instalaciones,
no un producto distinto.

## Alcance Gate 1

- Proveedores (`suppliers`)
- Insumos (`materials`) con unidad base
- Relación proveedor–material (`supplier_materials`)
- Historial inmutable (`material_cost_history`)
- RPC `update_material_cost` + `compute_material_unit_cost`
- Auditoría (`cost_audit_log`)
- RLS admin-only en tablas de costos

Fuera de alcance: BOM, productos manufacturados, Drive, asistente M&M, e-commerce.

## Seguridad

- Tablas de costos: políticas `Costos: solo admin` / sin acceso `anon`.
- `update_material_cost`: `SECURITY DEFINER`, exige `is_admin()`, `EXECUTE` solo `authenticated`
  (revocado explícitamente para `anon`).
- Aislamiento por tenant en costos: **pendiente** cuando el catálogo de costos sea multi-tenant;
  hoy el dominio es administración global vía rol admin.

## Datos de prueba

Usar prefijos `TEST` / `DEMO` en nombres si se cargan datos manuales. No usar costos reales del
negocio en validaciones automatizadas.
