# Supabase TiendaPro — conexión y reinicio 3.0

> Proyecto **autorizado:** `dnptsudsxrcamtxfiszh`  
> Ref **obsoleta (no operar):** `lwenyboejvwuopsenrwx`  
> **Casa León:** prohibido (`casa-leon-prod` / `emmlctfoxtuspxaanugg`)

## Verificación de identidades

| Plataforma | Estado |
|------------|--------|
| **GitHub** | Verificado: `tiendapronet2026-wq/tienda-web` (API gh) |
| **Vercel** | Proyecto esperado: `tiendapronet2026-wqs-projects/tienda-web` (integración PR; sin cambios remotos en esta entrega) |
| **Supabase MCP** | **Bloqueado:** `list_projects` solo muestra `casa-leon-prod`. Ref `dnptsudsxrcamtxfiszh` → permiso denegado en `get_project`. |

### Única acción necesaria (sin pegar claves en chat)

Ver guía detallada: **`docs/supabase-mcp-tiendapro.md`**.

Resumen: autenticar un servidor MCP **scoped** a TiendaPro (`project_ref=dnptsudsxrcamtxfiszh`, `read_only=true`) con la **cuenta Supabase que posee ese proyecto**, sin desconectar Casa León. Enlace al proyecto: [Dashboard TiendaPro](https://supabase.com/dashboard/project/dnptsudsxrcamtxfiszh).

Antes de SQL destructivo: leer **`docs/supabase-reconstruction-approval.md`** y aprobar explícitamente.

## Esquema en repositorio

- Legacy archivado: `supabase/migrations_legacy/` (11 archivos — no aplicar).
- Baseline activo: **`supabase/migrations/20260920000000_tiendapro_baseline.sql`**
  - Reinicio `public` autorizado para TiendaPro sin datos comerciales reales.
  - Núcleo SaaS + RLS + **dos tenants de prueba** (`tenant-alpha-test`, `tenant-beta-test`).

## Tras conectar MCP (pendiente autorización expresa)

1. Backup gratuito: Dashboard → Database → Backups (si plan lo incluye) o export puntual.
2. Confirmar ref del proyecto = **`dnptsudsxrcamtxfiszh`** antes de `apply_migration`.
3. Aplicar **solo** `20260920000000_tiendapro_baseline.sql`.
4. Crear usuarios Auth + filas `control_operators` / `tenant_memberships` para prueba de aislamiento.
5. En Vercel/preview: `NEXT_PUBLIC_SUPABASE_URL=https://dnptsudsxrcamtxfiszh.supabase.co`, keys del mismo proyecto, `TIENDAPRO_PLATFORM_DB=1`.

## Paneles privados

- `/control` y `/app` requieren sesión Supabase (middleware).
- Showroom `/demos` permanece público y ficticio.
