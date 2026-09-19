# TiendaPro — auditoría y aprobación antes de SQL destructivo

> Proyecto **único autorizado:** `dnptsudsxrcamtxfiszh`  
> **No ejecutar** en Casa León ni en ref obsoleta `lwenyboejvwuopsenrwx`.

## Estado de conexión (esta entrega)

| Verificación | Resultado |
|--------------|-----------|
| MCP OAuth activo (plugin Supabase) | Org visible: **sistemacasaleon-sketch's Org** — solo proyecto **`casa-leon-prod`** |
| `get_project(dnptsudsxrcamtxfiszh)` | Permiso denegado |
| `execute_sql` en ref TiendaPro | Permiso denegado |
| Auditoría remota de tablas / migraciones / backups | **No realizada** (bloqueada por permisos) |

Hasta conectar MCP al proyecto TiendaPro, el inventario real de objetos en `public` es **desconocido**. La auditoría remota pendiente incluye:

1. `list_tables` (schemas `public`, `storage` si aplica)
2. `list_migrations` (historial remoto vs repo)
3. Dashboard → Database → Backups (plan Free: backups automáticos limitados; export lógico vía SQL read-only si no hay snapshot)

## Migración preparada en repo

Archivo: **`supabase/migrations/20260920000000_tiendapro_baseline.sql`**

### Alcance destructivo explícito (líneas 10–17)

```sql
drop schema if exists public cascade;
create schema public;
-- … grants …
```

**Elimina en el proyecto autorizado:**

- **Todo** el esquema `public`: tablas, vistas, funciones, triggers, políticas RLS, secuencias, tipos y datos en `public`.
- Objetos legacy probables si existían (tienda, productos, pedidos, cotizaciones, costos, perfiles antiguos, etc.).

**No elimina directamente:**

- Esquema **`auth`** (usuarios Supabase Auth) — los usuarios pueden seguir existiendo.
- Esquema **`storage`** (buckets/objetos) — no se toca en esta migración; revisar buckets huérfanos aparte.
- Extensiones instaladas a nivel DB (p. ej. `pgcrypto` se re-afirma con `create extension if not exists`).

**Recrea después del DROP:**

- `profiles` + trigger `on_auth_user_created` en **`auth.users`**
- Núcleo SaaS: `module_catalog`, `commercial_plans`, `tenants`, `control_operators`, `tenant_memberships`, `tenant_module_activations`, `platform_projects`, `platform_audit_log`
- Funciones helper RLS + políticas en todas las tablas anteriores
- Seeds + tenants de prueba **`tenant-alpha-test`** y **`tenant-beta-test`**

### Riesgo colateral

- Si existían triggers/políticas en `public` referenciados desde fuera de `public`, el CASCADE puede afectar dependencias en `public` únicamente.
- Usuarios Auth sin fila en `profiles` recibirán perfil al próximo evento de registro; usuarios existentes pueden quedar sin `profiles` hasta backfill manual.

## Alternativa más acotada (evaluación)

| Enfoque | Ventajas | Desventajas |
|---------|----------|-------------|
| **`DROP SCHEMA public CASCADE`** (baseline actual) | Reproducible, alineado con reinicio 3.0, una sola migración | Destructivo total en `public`; requiere backup verificado |
| **DROP TABLE solo legacy** (lista tras `list_tables`) | Menor blast radius si quedan pocos objetos | Frágil si el remoto diverge del repo; no garantiza estado limpio SaaS |
| **Nuevo proyecto Supabase** | Aislamiento máximo | Costo/operación extra; **no solicitado** (reutilizar `dnptsudsxrcamtxfiszh`) |

**Recomendación:** mantener el baseline con `DROP SCHEMA public CASCADE` **solo después** de backup verificado y confirmación explícita del propietario, con ref comprobada vía MCP.

## Checklist de aprobación (propietario)

Responder **sí** explícitamente a:

1. Proyecto Supabase = **`dnptsudsxrcamtxfiszh`** (verificado en MCP o Dashboard).
2. Respaldo realizado y verificado (indicar método: backup dashboard / export SQL).
3. Autorizo aplicar **`20260920000000_tiendapro_baseline.sql`** (incluye `DROP SCHEMA public CASCADE`).

## Tras aprobación (orden operativo — no ejecutado aún)

1. Quitar `read_only` del MCP o usar migración vía `apply_migration` con servidor con permisos de escritura scoped a `dnptsudsxrcamtxfiszh`.
2. Aplicar **solo** el baseline en TiendaPro.
3. Verificar RLS (`get_advisors` security).
4. Crear 2 usuarios Auth + `control_operators` + `tenant_memberships` (alpha/beta) y probar aislamiento cross-tenant.
5. Configurar env preview: URL/keys del proyecto + `TIENDAPRO_PLATFORM_DB=1` cuando pruebas OK.
6. **No** merge / **no** producción en esta fase.
