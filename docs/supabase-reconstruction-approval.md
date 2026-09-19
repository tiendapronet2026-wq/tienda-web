# TiendaPro — auditoría y aprobación antes de SQL destructivo

> Proyecto **único autorizado:** `dnptsudsxrcamtxfiszh`  
> **No ejecutar** en Casa León ni en ref obsoleta `lwenyboejvwuopsenrwx`.

## Estado de conexión (esta entrega)

| Verificación | Resultado |
|--------------|-----------|
| MCP **`supabase-tiendapro`** (scoped `dnptsudsxrcamtxfiszh`, read_only) | **OK** — `list_tables`, `list_migrations`, `execute_sql` SELECT |
| Esquema **`public`** | Existe; **0 tablas/vistas/funciones** (vacío) |
| **`list_migrations` / historial Supabase** | **[]** — ninguna migración aplicada vía CLI/MCP |
| **`auth.users`** | 0 filas |
| **`storage.buckets`** | 0 |
| Postgres | 17.6 · extensiones instaladas: `pgcrypto`, `uuid-ossp`, `pg_stat_statements`, `supabase_vault`, etc. |

Auditoría remota completada el **2026-09-19** exclusivamente vía MCP `supabase-tiendapro`. Casa León no consultado.

### Plan de respaldo (antes del baseline)

| Método | Viabilidad | Notas |
|--------|------------|--------|
| **Dashboard → Database → Backups** | Recomendado | Snapshot gestionado por Supabase según plan del proyecto; verificar en [Dashboard TiendaPro](https://supabase.com/dashboard/project/dnptsudsxrcamtxfiszh/database/backups). |
| **Export lógico `public`** | Bajo valor hoy | `public` sin objetos; no hay datos de negocio que exportar. |
| **Export Auth / Storage** | Opcional | 0 usuarios y 0 buckets; registro documental suficiente con conteos de esta auditoría. |
| **Copia del baseline en repo** | Ya hecho | `supabase/migrations/20260920000000_tiendapro_baseline.sql` — reproducible post-aprobación. |

**Respaldo verificable mínimo aceptable:** confirmación en dashboard de backup disponible **o** captura de esta auditoría (esquema `public` vacío) + tu aprobación explícita abajo.

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
