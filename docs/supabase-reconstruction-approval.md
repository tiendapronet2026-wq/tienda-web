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

### Alcance (no destructivo)

- **`create schema if not exists public`** + `create table if not exists` + seeds `on conflict do nothing`.
- **Sin** `DROP SCHEMA public CASCADE`.
- Trigger **`profiles_prevent_privilege_self_escalation`**: bloquea auto-cambio de `role`, `status`, `id`, `created_at`.
- Política **`profiles_self_update`**: solo `first_name` / `last_name` / `updated_at` vía RLS + trigger.
- **`tenant_modules_write`**: solo **`is_control_owner()`** (licencias vía Control; tenants solo lectura).

### Validación local (PostgreSQL 16 aislado)

```bash
./supabase/tests/isolated/run.sh
```

Pruebas en `supabase/tests/isolated/99_rls_assertions.sql`:

1. Usuario Alpha ve módulos de su tenant, no los de Beta.
2. Admin tenant **no** puede insertar activaciones de módulo.
3. Control owner **sí** puede activar módulo (`stock` en Beta).
4. Usuario **no** puede escalar `role` en `profiles`; sí puede cambiar `first_name`.

## Checklist de aprobación (propietario)

Responder **sí** explícitamente a:

1. Proyecto Supabase = **`dnptsudsxrcamtxfiszh`** (verificado en MCP o Dashboard).
2. Autorizo aplicar **`20260920000000_tiendapro_baseline.sql`** (migración **no destructiva**; remoto hoy con `public` vacío).

## Tras aprobación (orden operativo — no ejecutado aún)

1. Quitar `read_only` del MCP o usar migración vía `apply_migration` con servidor con permisos de escritura scoped a `dnptsudsxrcamtxfiszh`.
2. Aplicar **solo** el baseline en TiendaPro.
3. Verificar RLS (`get_advisors` security).
4. Crear 2 usuarios Auth + `control_operators` + `tenant_memberships` (alpha/beta) y probar aislamiento cross-tenant.
5. Configurar env preview: URL/keys del proyecto + `TIENDAPRO_PLATFORM_DB=1` cuando pruebas OK.
6. **No** merge / **no** producción en esta fase.
