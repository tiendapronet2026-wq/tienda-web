# Supabase TiendaPro — conexión, auditoría local y núcleo persistente

> **Fecha:** 2026-09-19 · PR #1 · **Sin SQL remoto ejecutado en esta entrega**

## Fase 1 — Conexión MCP/API

| Campo | Resultado |
|-------|-----------|
| Proyecto esperado (código) | `lwenyboejvwuopsenrwx` (`next.config.ts`, `AGENTS.md`) |
| MCP Supabase visible | Solo **`casa-leon-prod`** (`emmlctfoxtuspxaanugg`) — org `sistemacasaleon-sketch's Org` |
| Proyecto TiendaPro vía API | **No accesible** con credenciales actuales del agente |
| SQL remoto | **No ejecutado** (bloqueo correcto hasta verificación) |

### Cómo conectar TiendaPro **sin desvincular Casa León**

El plugin MCP de Supabase en Cursor suele autorizar **una organización por sesión OAuth**. Casa León y TiendaPro pueden coexistir en la misma cuenta Supabase o en orgs distintas; el agente solo ve la org ya autorizada.

**Pasos recomendados (sin pegar secretos en el chat):**

1. En [Supabase Dashboard](https://supabase.com/dashboard), abrir el proyecto cuyo **Project ID / ref** sea **`lwenyboejvwuopsenrwx`** (confirmar en *Project Settings → General*).
2. Verificar que ese proyecto pertenece a la **cuenta u organización TiendaPro** (no mezclar datos con Casa León).
3. En **Cursor → Settings → MCP → Supabase** (o integración Supabase del agente):
   - **Opción A:** Si TiendaPro está en la **misma cuenta** que Casa León, ampliar el alcance OAuth / reautorizar para incluir **ambos proyectos** (no eliminar Casa León del dashboard).
   - **Opción B:** Si TiendaPro está en **otra cuenta**, usar **Sign in with different account** / segunda conexión MCP si la UI lo permite, o conectar la org TiendaPro como cuenta adicional sin borrar la sesión Casa León en el dashboard web.
4. Tras reconectar, pedir al agente que ejecute solo **`list_projects`** y confirmar que aparece un proyecto distinto de `casa-leon-prod` con ref **`lwenyboejvwuopsenrwx`**.
5. **No** compartir `service_role` ni contraseñas en chat; usar OAuth MCP o secrets en Vercel/entorno Cloud.

**Autorización única pendiente (operación remota):** aplicar migración `20260919120000_platform_saas_core.sql` en el proyecto verificado (additiva, sin DROP de legacy).

---

## Fase 2 — Auditoría (repositorio local / diseño remoto)

### Migraciones en repo (`supabase/migrations/`)

| Migración | Contenido |
|-----------|-----------|
| `20260702220000_init_store` | categories, products, cart_items (legacy tienda) |
| `20260703100000_profiles_and_roles` | profiles, auth trigger, `is_admin()` |
| `20260703110000_extend_catalog_and_inventory` | catálogo extendido |
| `20260703120000_rls_policies` | RLS perfiles, catálogo, carrito |
| `20260703130000_storage_product_images` | storage |
| `20260703140000_orders_preparation` | pedidos |
| `20260703150000_admin_notes` | notas admin |
| `20260703160000_security_hardening` | endurecimiento |
| `20260717200000_quote_requests` | cotizaciones |
| `20260718010000_cost_management` | motor costos legacy |
| **`20260919120000_platform_saas_core`** | **NUEVO — núcleo SaaS (local, no aplicado remoto)** |

### Autenticación existente (diseño)

- Supabase Auth + `public.profiles` con roles `customer | admin | seller`.
- Funciones `is_admin()`, `is_active_user()` — orientadas **legacy tienda**, no multitenancy SaaS.

### RLS existente

- Catálogo público / admin global.
- Carrito por sesión/usuario.
- **Conflicto con arquitectura nueva:** admin global ≠ operador Control vs membresía tenant. El núcleo SaaS **añade tablas nuevas** con RLS propio; legacy no se elimina en esta fase.

### Respaldos

- No verificables remotamente sin MCP TiendaPro. Antes de migración remota: **Backup** en Dashboard → *Database → Backups* o snapshot manual.

---

## Fase 3 — Núcleo multicliente (migración preparada)

Archivo: `supabase/migrations/20260919120000_platform_saas_core.sql`

Tablas: `module_catalog`, `commercial_plans`, `tenants`, `control_operators`, `tenant_memberships`, `tenant_module_activations`, `platform_projects`, `platform_audit_log`.

Funciones: `is_control_operator()`, `is_control_owner()`, `has_tenant_membership()`.

RLS: separación **Control** vs **miembros tenant**; sin acceso cruzado entre tenants.

---

## Fase 4 — App `/app`

- `src/lib/platform/tenant-loader.ts` — carga entitlements desde Supabase solo si:
  - `NEXT_PUBLIC_SUPABASE_URL` → ref `lwenyboejvwuopsenrwx`
  - `TIENDAPRO_PLATFORM_DB=1`
  - migración aplicada y usuario con membresía
- Si no: **mock** + `PersistenceSourceBadge` (no presentar como productivo).
- `/demos` sin cambios (ficticio).

Variables: ver `.env.example`.

---

## Fase 5 — Pruebas

| Suite | Alcance |
|-------|---------|
| `resolve-modules.test.ts` | Activación/suspensión/integraciones |
| `rls-helpers.test.ts` | Aislamiento tenant / Control (espejo servidor) |

Pruebas **no** sustituyen auditoría RLS en BD hasta migración aplicada.

---

## Operaciones pendientes de autorización

1. Conectar MCP al proyecto **`lwenyboejvwuopsenrwx`** (pasos arriba).
2. Auditoría remota: `list_tables`, advisors, logs (solo lectura).
3. **Una autorización expresa** para `supabase db push` / `apply_migration` del archivo `20260919120000_platform_saas_core.sql`.
4. Seed tenant demo + primera membresía + operador Control.
5. Activar `TIENDAPRO_PLATFORM_DB=1` en entorno preview/producción.

## Próximo paso único

**Reautorizar MCP Supabase hasta ver `lwenyboejvwuopsenrwx` en `list_projects`, luego autorizar aplicación remota de la migración núcleo y validar RLS con dos tenants de prueba.**
