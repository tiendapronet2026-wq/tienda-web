# Limpieza Auth legacy — TiendaPro (`dnptsudsxrcamtxfiszh`)

Autorización del propietario (2026-09-19): eliminar **solo** estos usuarios SQL-seed corruptos para GoTrue:

| Email | UUID (eliminado) |
|-------|------------------|
| `alpha-test@tiendapro.local` | `11111111-1111-1111-1111-111111111111` |
| `beta-test@tiendapro.local` | `22222222-2222-2222-2222-222222222222` |
| `control-owner-test@tiendapro.local` | `33333333-3333-3333-3333-333333333333` |

**No** se tocaron usuarios v2 (`preview-*-v2@tiendapro.local`) ni otros proyectos.

## Relaciones eliminadas por cascada (`ON DELETE CASCADE`)

Al borrar `auth.users`, Postgres eliminó automáticamente:

| Tabla | Legacy afectado |
|-------|-----------------|
| `public.profiles` | 3 filas (mismos UUID) |
| `public.tenant_memberships` | Alpha → tenant `4f71bdec-…` (admin); Beta → `4d866d36-…` (admin) |
| `public.control_operators` | Control legacy → `owner` |

Los tenants y datos v2 (`tenant_memberships` / `control_operators` de cuentas v2) **permanecen**.

## Método de eliminación

1. **Intento preferido:** Auth Admin API `DELETE /auth/v1/admin/users/{id}` con `service_role` (CLI `supabase projects api-keys`).
   - **Resultado:** HTTP **500** — `Database error loading user` / `finding users` mientras existían filas legacy (sin `auth.identities` y UUIDs sentinel no cargables por GoTrue).
2. **Reparación mínima probada:** inserción de `auth.identities` (email) vía `supabase db query --linked` — **no** desbloqueó Admin API DELETE (mismo 500 en GET por UUID).
3. **Eliminación efectiva:** tres `DELETE` puntuales en `auth.users` (guard `id` + `email`) con **`supabase db query --linked`**, mecanismo oficial de consulta remota del proyecto. Sin cambios RLS ni DELETE masivo sin filtro.

## Verificación post-limpieza

| Comprobación | Resultado |
|--------------|-----------|
| Legacy ausentes en `auth.users` | OK (solo quedan 4 cuentas v2) |
| `GET /auth/v1/admin/users` | **200**, 4 usuarios |
| Login password v2 (alpha, beta, control) | OK (200 token) |
| Membresías / operador v2 | OK (mismos `tenant_id` / `owner`) |
| Preview UI (`TIENDAPRO_PLATFORM_DB=1`) | OK (control, app, denegado sin rol, aislamiento Alpha/Beta) |

## Usuarios v2 de referencia (Preview)

- `preview-alpha-v2@tiendapro.local` — admin tenant alpha-test  
- `preview-beta-v2@tiendapro.local` — admin tenant beta-test  
- `preview-control-v2@tiendapro.local` — operador Control `owner`  
- `preview-norole-v2@tiendapro.local` — sin rol (pruebas de denegación)

Contraseñas de Preview: archivo local del entorno de agente (`/tmp/tiendapro-preview-users.json`), no commitear.

## Producción / otros límites

Sin migraciones reaplicadas, sin Production, sin Casa León, sin MCP genérico Supabase.
