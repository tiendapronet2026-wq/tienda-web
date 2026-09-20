# Baseline aplicado — `dnptsudsxrcamtxfiszh`

> Fecha: 2026-09-19 · SQL repo: commit **`d664337`**  
> Backup gestionado: **omitido** (autorización propietario, proyecto vacío documentado)

## Migraciones registradas (remoto)

| Versión (Supabase) | Nombre | Contenido |
|--------------------|--------|-----------|
| `20260919215500` | `20260920000000_tiendapro_baseline` | Entrada inicial vacía (placeholder técnico en primer intento) |
| `20260919215631` | `20260920000000_tiendapro_baseline_schema` | **Baseline completo** (d664337) |

El esquema efectivo corresponde a la segunda entrada. No re-aplicar sin revisar historial.

## Esquema `public` (post-aplicación)

- **9 tablas**, todas con **RLS enabled**
- **8** módulos catálogo · **4** planes · **2** tenants (`tenant-alpha-test`, `tenant-beta-test`)
- **6** filas `tenant_module_activations`
- **`anon`:** sin `SELECT` en `module_catalog` (`has_table_privilege` → false)

## Pruebas RLS remotas (MCP write, usuarios *test* desechables)

- Usuarios `@tiendapro.local` + memberships alpha/beta + control owner de prueba
- Alpha **no** ve módulos de Beta bajo rol `authenticated` + JWT simulado
- Admin Beta **no** inserta activación `finanzas` (bloqueado)

## MCP

- Escritura usada solo para migración + verificación
- Repo: `.cursor/mcp.json` restaurado con **`read_only=true`**
- Reautenticar MCP en Cursor si la sesión activa sigue en modo escritura (ver informe al usuario)
