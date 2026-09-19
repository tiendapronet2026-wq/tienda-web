# Baseline `20260920000000` — intento de aplicación remota

> Proyecto autorizado: **`dnptsudsxrcamtxfiszh`**  
> Commit SQL aprobado: **`d664337`** (HEAD al intento)

## Pre-checks (MCP `supabase-tiendapro`, solo lectura)

| Check | Resultado |
|-------|-----------|
| `public` tablas | **0** (`list_tables` → `[]`) |
| Migraciones remotas | **0** (`list_migrations` → `[]`) |
| Backup gestionado | **Omitido** por autorización explícita del propietario (proyecto vacío documentado) |
| Usuario DB MCP | `supabase_read_only_user`, `transaction_read_only=on` |

## Bloqueo de ejecución

- `apply_migration`: **no expuesto** en MCP scoped con `read_only=true`.
- `execute_sql` DDL: `ERROR 25006: cannot execute CREATE TABLE in a read-only transaction`.
- **Migración remota no aplicada.** Estado remoto sin cambios.

## Para reintentar (una acción)

En **Cursor → Settings → Tools & MCP**, editar **`supabase-tiendapro`** y usar URL **sin** `read_only=true`:

`https://mcp.supabase.com/mcp?project_ref=dnptsudsxrcamtxfiszh&features=database,docs`

Reautenticar, reanudar el agente y pedir aplicar el baseline. Tras éxito, volver a añadir `read_only=true`.
