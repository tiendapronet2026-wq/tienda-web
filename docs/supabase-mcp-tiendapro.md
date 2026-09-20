# Supabase MCP — conexión TiendaPro (sin tocar Casa León)

## Diagnóstico (Cloud Agent)

- Servidor hosted: `https://mcp.supabase.com/mcp` (plugin Supabase en Cursor).
- Sesión OAuth actual: org **sistemacasaleon-sketch's Org** → solo **`casa-leon-prod`** (`emmlctfoxtuspxaanugg`).
- Proyecto TiendaPro **`dnptsudsxrcamtxfiszh`** está en **otra cuenta u organización** (no visible en `list_projects`).

**No desconectar** la sesión MCP de Casa León. Añadir acceso TiendaPro en paralelo.

## Opción A — OAuth scoped (recomendada, sin PAT en chat)

1. En el repo existe **`.cursor/mcp.json`** con servidor **`supabase-tiendapro`**:
   - URL: `https://mcp.supabase.com/mcp?project_ref=dnptsudsxrcamtxfiszh&read_only=true&features=database,docs`
   - Limita herramientas a BD/docs y solo lectura hasta la fase de migración.
2. En **Cursor → Settings → Tools & MCP** (o configuración MCP del **Cloud Agent environment**):
   - Habilitar / autenticar el servidor **`supabase-tiendapro`** (entrada separada del plugin `supabase` genérico si aparecen ambos).
   - Completar OAuth en el navegador con la **cuenta Supabase que posee** el proyecto [`dnptsudsxrcamtxfiszh`](https://supabase.com/dashboard/project/dnptsudsxrcamtxfiszh).
3. Reiniciar o reanudar el Cloud Agent y pedir al agente: `list_tables` en proyecto scoped (sin `project_id` si el servidor está project-scoped).

Documentación oficial: [Supabase MCP](https://supabase.com/docs/guides/getting-started/mcp) (parámetros `project_ref`, `read_only`, `features`).

## Opción B — PAT en secretos del environment (sin pegar token en chat)

1. Crear token en [Supabase Account → Access Tokens](https://supabase.com/dashboard/account/tokens) (cuenta/org de TiendaPro).
2. En [Cloud Agent environment](https://cursor.com/dashboard/cloud-agents/environments/e/06431a1b-b45e-11f1-bb68-864e54d14197) → **Secrets**:
   - `SUPABASE_ACCESS_TOKEN` (TiendaPro org)
   - `SUPABASE_PROJECT_REF` = `dnptsudsxrcamtxfiszh`
3. Extender `.cursor/mcp.json` con headers `Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}` en el servidor scoped (solo si el cliente sustituye variables de entorno).

## Verificación read-only esperada

Tras conectar:

- Identificador de proyecto = **`dnptsudsxrcamtxfiszh`**
- `list_tables` / `list_migrations` en `public`
- `get_advisors` (security)
- **No** usar `execute_sql` / `apply_migration` en **`emmlctfoxtuspxaanugg`**

## Limitación conocida Cursor

Múltiples servidores Supabase HTTP pueden enrutar al primero ([cursor#3675](https://github.com/cursor/cursor/issues/3675)). Mitigación: **un solo servidor activo scoped a TiendaPro** durante tareas de BD TiendaPro; mantener Casa León deshabilitado temporalmente en MCP **solo durante esa sesión**, sin borrar credenciales.
