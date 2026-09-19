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

1. Abrir **Cursor → Settings → MCP → Supabase**.
2. Iniciar sesión / reautorizar con la **cuenta u organización donde vive el proyecto `dnptsudsxrcamtxfiszh`** (Dashboard Supabase → Project Settings → General).
3. Si Casa León comparte cuenta: ampliar OAuth para incluir **ambos proyectos**; **no** eliminar Casa León del dashboard.
4. Si TiendaPro está en otra cuenta: usar **Sign in with different account** / conexión adicional MCP (sin borrar la sesión web de Casa León).
5. Confirmar con el agente: `list_projects` debe listar **`dnptsudsxrcamtxfiszh`** (nombre distinto de `casa-leon-prod`).

Hasta entonces: **no se aplica SQL remoto** (migración preparada en repo solamente).

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
