# Gate 3G — Mercado Pago OAuth (vinculación real)

## Estado

**EN PROGRESO** — implementación en rama `feat/tiendapro-mercadopago-oauth-g3g`. Smoke real y cierre GREEN pendientes de app MP + env Vercel.

---

## Preflight (master @ 6669a3b)

### REUTILIZADO

| Área | Detalle |
|------|---------|
| `IntegrationProvider` | Tipos, registry, `link_demo` piloto |
| Tablas 3F | `integration_connections`, `integration_link_sessions`, `integration_connection_credentials`, `integration_audit_events` |
| Cifrado | AES-GCM `INTEGRATION_CREDENTIALS_KEY` |
| UX | `/admin/integraciones` → Conectar → QR → `/connect/<token>` → polling |
| RPC | `create_integration_link_session`, `finalize`, `store_integration_connection_credential`, list/verify/revoke admin |
| Campos OAuth | `integration_link_sessions.oauth_state`, `metadata` |

### FALTANTE (implementado en 3G)

| Ítem |
|------|
| `MercadoPagoIntegrationProvider` real |
| PKCE S256 + state en sesión |
| `attach_integration_link_oauth` / `resolve_integration_oauth_callback` |
| `/api/integrations/mercado-pago/callback` |
| Confirm → redirect a `auth.mercadopago.com` |
| Token exchange `POST https://api.mercadopago.com/oauth/token` |
| `verifyConnection` / `refreshCredentials` |
| Env `MERCADOPAGO_CLIENT_ID` / `MERCADOPAGO_CLIENT_SECRET` en Vercel |
| App MP con redirect estático y PKCE habilitado |
| Smoke real producción |

### RIESGOS

- Sin app MP o redirect mal configurado → OAuth falla en callback.
- `offline_access` requerido para refresh (documentado por MP).
- Revocación remota MP no documentada → revoke local.
- Rate-limit confirm in-memory (deuda 3F).
- Vercel sin credenciales MP → Conectar falla al confirmar redirect.

### FLUJO ELEGIDO

**B — Authorization Code + PKCE (S256)**  
Evidencia: Gate 3F diseñado para vincular **cuenta del vendedor** vía QR/teléfono; MP documenta Authorization Code para acceder a datos de terceros con intervención del usuario. `client_credentials` solo sirve para la app propia, no para conectar cuentas de comercios.

### CONFIGURACIÓN EXTERNA

1. App **Tienda Pro** en [Mercado Pago Developers](https://www.mercadopago.com.ar/developers/panel/app).
2. Redirect URL exacta: `https://www.tiendapro.net/api/integrations/mercado-pago/callback`
3. Habilitar **Authorization code + PKCE** en la app.
4. Vercel (server-only): `MERCADOPAGO_CLIENT_ID`, `MERCADOPAGO_CLIENT_SECRET`, opcional `MERCADOPAGO_REDIRECT_URI`.
5. Scopes solicitados: `read offline_access` (sin cobros).

---

## Flujo resumido

1. Admin → Mercado Pago → Conectar → QR (`/connect/<token>`).
2. Teléfono confirma Tienda Pro → redirect MP OAuth.
3. MP → callback → exchange code → cifrado → `connected`.
4. PC polling detecta `completed`.

---

## Checkout

**Sin cambios.** No preferencias, pagos ni órdenes en 3G.
