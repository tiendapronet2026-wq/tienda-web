# Vercel Preview — TiendaPro (`tiendapronet2026-wqs-projects/tienda-web`)

Configuración **solo para entornos Preview** (no Production). No commitear valores secretos.

## Variables requeridas (Preview)

| Variable | Entorno | Descripción |
|----------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Preview | `https://dnptsudsxrcamtxfiszh.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Preview | Clave **anon/public** del proyecto TiendaPro (Dashboard → API) |
| `SUPABASE_SERVICE_ROLE_KEY` | Preview | Clave **service_role** (solo server; opcional hasta carrito legacy) |
| `NEXT_PUBLIC_SITE_URL` | Preview | URL canónica del deployment Preview (auth redirects) |

## Flag plataforma (Preview)

| Variable | Preview | Production (master) |
|----------|---------|------------------------|
| `TIENDAPRO_PLATFORM_DB=1` | **Activa** — `/control` y `/app` usan RLS real | **No configurada** — sin merge de env Prod en PR #1; paneles seguirían en mock hasta autorizar |

Sin `TIENDAPRO_PLATFORM_DB=1` + URL `dnptsudsxrcamtxfiszh`, `/control` y `/app` usan datos mock aunque haya sesión Supabase.

## Supabase Auth (Dashboard)

En **Authentication → URL Configuration** del proyecto `dnptsudsxrcamtxfiszh`, agregar la URL Preview a:

- Site URL (o usar `NEXT_PUBLIC_SITE_URL` coherente)
- Redirect URLs: `{NEXT_PUBLIC_SITE_URL}/login`, `{NEXT_PUBLIC_SITE_URL}/actualizar-password`, etc.

### Site URL (Supabase Auth)

**Valor oficial aplicado:** `https://www.tiendapro.net` (antes `http://localhost:3000` / `http://127.0.0.1:3000` en proyecto).  
Cambio aplicado con `supabase config push` **solo** en `auth.site_url` (sin tocar Storage/Vector ni allow list).

### Redirect URLs Preview (Supabase Auth allow list)

- `https://tienda-web-git-cursor-tien-2a36fa-tiendapronet2026-wqs-projects.vercel.app/login`
- `https://tienda-web-git-cursor-tien-2a36fa-tiendapronet2026-wqs-projects.vercel.app/actualizar-password`
- `https://tienda-web-git-cursor-tien-2a36fa-tiendapronet2026-wqs-projects.vercel.app/**`
- `https://tienda-*-tiendapronet2026-wqs-projects.vercel.app/login`
- `https://tienda-*-tiendapronet2026-wqs-projects.vercel.app/actualizar-password`
- `https://tienda-*-tiendapronet2026-wqs-projects.vercel.app/**`

**Retirado:** `https://*-tiendapronet2026-wqs-projects.vercel.app/**` (comodín de todo el equipo Vercel).

Aplicación: `supabase config push` (solo `auth.additional_redirect_urls`). Réplica: `supabase/config.toml`.

## Checklist Preview

1. Configurar las cuatro variables de la primera tabla en Vercel → Settings → Environment Variables → **Preview only**.
2. Desplegar rama del PR #1 y abrir `/login` (sin ciclo `/control`).
3. Iniciar sesión con usuarios **v2** (Auth oficial, login verificado por API):
   - `preview-alpha-v2@tiendapro.local` → tenant `tenant-alpha-test` (membresía admin)
   - `preview-beta-v2@tiendapro.local` → tenant `tenant-beta-test` (membresía admin)
   - `preview-control-v2@tiendapro.local` → operador Control (`owner`)
   Los usuarios legacy `*-test@tiendapro.local` (SQL RLS) **fueron eliminados** del proyecto TiendaPro el 2026-09-19; ver `docs/auth-legacy-cleanup.md`. Usar solo cuentas **v2** en Preview.
4. Validar `/control` (operador) o `/app` (membresía activa) y acceso denegado para cuentas sin rol.
5. Con `TIENDAPRO_PLATFORM_DB=1` ya en Preview, repetir smoke test tras cada cambio de env.

## Producción

No modificar env de Production en esta fase.
