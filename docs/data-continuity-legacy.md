# Continuidad de datos — Supabase legacy

## Estado verificado (2026-09-20)

| Proyecto | Ref | Acceso CLI (cuenta TiendaPro) |
|----------|-----|-------------------------------|
| **Actual** | `dnptsudsxrcamtxfiszh` | Sí (org `tiendapronet2026-wq`) |
| **Anterior** | `lwenyboejvwuopsenrwx` | **No** — `projects api-keys` → HTTP 403; proyecto no listado en la org |

Producción operó contra el ref legacy hasta el cambio de env; **no fue posible** leer usuarios, pedidos ni catálogo distinto del seed sin credenciales de ese proyecto.

## Base actual (`dnptsudsxrcamtxfiszh`) post-despliegue

- **Pedidos** desde ~2026-09-20 00:36 UTC: **0**
- **Auth:** 4 cuentas Preview v2 (`@tiendapro.local`) + admin comercial `tiendapro.net.2026@gmail.com` (Auth oficial)
- **Catálogo:** 6 productos / 3 categorías (seed legacy; coincide con www previo a migración)

## Importación cuando haya acceso legacy

1. Script aditivo: `scripts/import-legacy-store-data.mjs` (`--dry-run` primero).
2. **Auth:** export/import vía Dashboard o bulk import; contraseñas **no** migrables — recuperación oficial (`/recuperar-password`).
3. Conciliar conteos orders/products antes de desactivar checkout.

## Acción humana imprescindible (única)

En [Supabase Dashboard](https://supabase.com/dashboard), con la **cuenta propietaria del proyecto `lwenyboejvwuopsenrwx`**:

1. **Project Settings → Team** (preferido): invitar a la cuenta de la org TiendaPro (`tiendapronet2026-wq`) como **Developer** o **Administrator** — **sin transferir ownership**.
2. **Alternativa:** export **Database backup** + **Auth users** y ejecutar `scripts/import-legacy-store-data.mjs --dry-run` antes de importar.

Sin invitación o export, no es posible conciliar usuarios/pedidos históricos.
