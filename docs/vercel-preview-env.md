# Vercel Preview — TiendaPro (`tiendapronet2026-wqs-projects/tienda-web`)

Configuración **solo para entornos Preview** (no Production). No commitear valores secretos.

## Variables requeridas (Preview)

| Variable | Entorno | Descripción |
|----------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Preview | `https://dnptsudsxrcamtxfiszh.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Preview | Clave **anon/public** del proyecto TiendaPro (Dashboard → API) |
| `SUPABASE_SERVICE_ROLE_KEY` | Preview | Clave **service_role** (solo server; opcional hasta carrito legacy) |
| `NEXT_PUBLIC_SITE_URL` | Preview | URL canónica del deployment Preview (auth redirects) |

## Variable diferida (no activar aún)

| Variable | Cuándo |
|----------|--------|
| `TIENDAPRO_PLATFORM_DB=1` | **Después** de probar login en Preview con usuarios reales (`control_operators` / `tenant_memberships`). Sin esta flag, `/control` y `/app` usan mocks de desarrollo con sesión Supabase. |

## Supabase Auth (Dashboard)

En **Authentication → URL Configuration** del proyecto `dnptsudsxrcamtxfiszh`, agregar la URL Preview a:

- Site URL (o usar `NEXT_PUBLIC_SITE_URL` coherente)
- Redirect URLs: `{NEXT_PUBLIC_SITE_URL}/login`, `{NEXT_PUBLIC_SITE_URL}/actualizar-password`, etc.

## Checklist Preview

1. Configurar las cuatro variables de la primera tabla en Vercel → Settings → Environment Variables → **Preview only**.
2. Desplegar rama del PR #1 y abrir `/login` (sin ciclo `/control`).
3. Iniciar sesión con usuario de prueba `@tiendapro.local` (operador o miembro tenant).
4. Validar `/control` (operador) o `/app` (membresía activa) y acceso denegado para cuentas sin rol.
5. Recién entonces setear `TIENDAPRO_PLATFORM_DB=1` en Preview y repetir smoke test.

## Producción

No modificar env de Production en esta fase.
