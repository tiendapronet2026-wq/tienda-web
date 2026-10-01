# Gate 1 — Fundación de costos (proveedores e insumos)

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
