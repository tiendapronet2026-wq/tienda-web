# Gate 3H — Mercado Pago Checkout Pro (Orders API)

## Preflight (master `efb1fe5`)

### Checkout / pedidos hoy

- `placeOrder` crea `orders` + `order_items`, precio releído del catálogo (`reloadCartLinesFromCatalog`), idempotencia `checkout_idempotency_key`.
- Estados: `pending`, `awaiting_payment`, `paid`, …
- Confirmación clásica: `/checkout/confirmacion` (sin pago online previo a 3H).
- Digital: `handleApprovedOrder` → RPC `grant_digital_entitlements_for_paid_order` (idempotente, evento único `entitlements_granted`).

### Gate 3G

- OAuth PKCE en `integration_connections` + credenciales cifradas (`integration_connection_credentials`).
- Refresh vía `mercadoPagoProvider.refreshCredentials`.
- Scope **actual en prod** (conexión activa): incluye `read`, `offline_access`, `payments read`; **no incluye `write` explícito**.

### Orders API

- Crear: `POST https://api.mercadopago.com/v1/orders` + `X-Idempotency-Key`.
- Consultar: `GET https://api.mercadopago.com/v1/orders/{order_id}`.
- Acreditado: `status=processed` + `status_detail=accredited`.

## Implementación 3H (rama `feat/tiendapro-gate-3h-mp-checkout-orders`)

- Flag: `TIENDAPRO_MP_ORDERS_CHECKOUT_ENABLED=1` (no activa Pack 150 por sí solo).
- Digital-only checkout → `/checkout/pagar` → Orders API → redirect `checkout_url`.
- Return URLs: `/checkout/pago/exito|pendiente|error?pedido=` (estado vía `/api/orders/{id}/payment-status`).
- Webhook: `POST /api/webhooks/mercadopago/orders` (firma `x-signature` + anti-replay `x-request-id`).
- Secreto: `MERCADOPAGO_WEBHOOK_SECRET` en Vercel Production (HUMAN GATE de panel MP).

## HUMAN GATE — scope `write`

Si `POST /v1/orders` responde 403/401 por permisos:

1. Mercado Pago Developers → **miTiendaProT** → permisos/scopes → habilitar **`write`** (Orders).
2. Admin → Integraciones → Mercado Pago → **reautorizar** OAuth.
3. Verificar scope del token incluye `write`.
4. Reintentar smoke técnico (sin cobro) y luego pago controlado.

## Gate B — Webhook Order (automatización MCP)

URL productiva: `https://www.tiendapro.net/api/webhooks/mercadopago/orders` · topic **`orders`**.

Herramienta oficial MCP: **`save_webhook`** (`callback`, `topics`). El token Bearer estático de usuario **no** sirve (`OAuth ownership validation failed`); hace falta MCP conectado por **OAuth** de la app **miTiendaProT** (`2979751689630770`).

Scripts (transporte MCP SSE vía TLS raw + carga de secreto en Vercel sin loguear valor):

- `scripts/gate3h-mp-oauth-save-webhook.mts` — token OAuth desde `integration_connections` (requiere Supabase prod + `INTEGRATION_CREDENTIALS_KEY` reales en el proceso).
- `scripts/mp-mcp-gate3h-save-webhook.mjs` — variante legacy (solo si MCP OAuth en Cursor está conectado).

Tras éxito: `MERCADOPAGO_WEBHOOK_SECRET` en Vercel Production (verificar solo existencia con `vercel env ls`, nunca el valor).

**Si MCP OAuth en Cursor no conecta:** una sola acción humana — **Cursor → Settings → Tools & MCP → Mercado Pago → Connect** (OAuth), luego reintentar `save_webhook`. Solo si eso falla: panel MP → Webhooks → Production → Order → guardar (sin copiar secretos al chat).

## Smoke privado Pack 150 (sin activar catálogo)

Reutiliza **`TIENDAPRO_DIGITAL_SMOKE_ENABLED=1`** (patrón L2 existente) + **`TIENDAPRO_MP_ORDERS_CHECKOUT_ENABLED=1`** en **Preview** (no Production hasta promote acordado).

| Mecanismo | Uso |
|-----------|-----|
| Checkout carrito + `digital_test` + `adminApproveDigitalTestOrder` | Simula **paid** sin Mercado Pago (legacy L2). |
| **Admin → Integraciones → “Smoke monetario MP (ARS 1.000)”** | Crea pedido marcado `[DIGITAL_TEST] [SMOKE_MP_MONETARY]`, relee **solo** `smoke-mp-pack-150` y precio **1000.00 ARS** server-side (`is_active=false`). Entrega alias al mismo Drive del Pack comercial. **No** usa `pack-150-cursos-digitales-bonos` (29999). |

**Seguridad:** `requireAdmin`, flags OFF → UI oculta y server action rechaza; no acepta producto/precio del cliente en flujo UI; no altera `is_active` ni visibilidad pública.

**Apagar post-smoke:** poner flags en `0` / quitar env en Preview.

## Production deploy

Confirmar deploy Git asociado a commit de master/PR 3H (no árbol local con auxiliares).
