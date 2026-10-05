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

## HUMAN GATE — Webhook Secret

1. URL productiva: `https://www.tiendapro.net/api/webhooks/mercadopago/orders`
2. Panel → Webhooks → Production → evento **Order (Mercado Pago)** → guardar.
3. Copiar clave → Vercel `MERCADOPAGO_WEBHOOK_SECRET` → redeploy desde master/PR 3H.

## Production deploy

Confirmar deploy Git asociado a commit de master/PR 3H (no árbol local con auxiliares).
