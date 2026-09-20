# Continuidad de datos — Supabase legacy

## Etapa comercial nueva (base `dnptsudsxrcamtxfiszh`)

Los pedidos y clientes a partir del despliegue checkout (2026-09-20) inician **historial comercial nuevo**. La migración aditiva desde legacy `lwenyboejvwuopsenrwx` queda **pendiente en track independiente** (sin acceso del propietario a la cuenta legacy). Importador preparado: `scripts/import-legacy-store-data.mjs` (`--dry-run` primero).

**Checkout producción:** permanece cerrado hasta decisión explícita (`TIENDAPRO_CHECKOUT_PRODUCTION=1`) y/o continuidad histórica acordada.

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

## Acción futura (legacy, fuera del alcance operativo actual)

La recuperación del proyecto legacy depende de acceso futuro del propietario a `lwenyboejvwuopsenrwx` (invitación org o export). **No bloquea** pruebas checkout en Preview ni operación admin en la base nueva.
