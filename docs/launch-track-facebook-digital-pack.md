# Launch Track — Pack digital + Facebook/Messenger

## Estado Launch Track

| Fase | Estado |
|------|--------|
| L1 | Foundation + pack seed (`is_active=false` hasta activación admin) + mis-compras + admin Drive |
| L2 | Checkout digital + `handleApprovedOrder` (RPC + lock) + smoke admin TEST |
| L3 | Webhook Messenger + `RuleBasedResponder` + conversaciones + admin `/admin/ventas-facebook` |
| L4+ | Meta app real + tokens en Vercel + flag prod — **no iniciado** |

### L3 (técnico cerrado sin Meta real)

- Webhook: `/api/integrations/meta/messenger/webhook` (GET verify + POST firmado).
- Provider: `MetaMessengerProvider` (`src/lib/sales/meta/`).
- Bot: `RuleBasedResponder` (sin IA).
- Precio: `loadPack150Catalog` → `products.price` del pack.
- Tracking: `?src=facebook_messenger&cid=<tracking_token>` (opaco).
- Flag: `TIENDAPRO_FACEBOOK_SALES_ENABLED=1` para procesar POST comercialmente.
- Migración: `20261003140000_tiendapro_facebook_sales_l3.sql` (no aplicada en prod).

### Auth / conversión Facebook

Checkout digital **requiere login** (Supabase email+password hoy). Existe recuperación por email; **no hay magic-link de login** en UI actual. Deuda documentada: fricción antes de ads — reutilizar auth existente, sin sistema paralelo.

### Carrito (RLS)

Usuarios autenticados: política `user_id = auth.uid()`. Invitados: service role server-side con `session_id` en cookie. Riesgo histórico de sesión anónima no es parte del flujo pack autenticado; no ampliar permisos en este PR.

### Drive MVP

Sin copiar archivos. Acceso vía URL resuelta **solo server-side** tras entitlement `active`. Enlace copiable por comprador — limitación aceptada (sin DRM).

### Reembolsos

Arquitectura permite `revoked` en entitlement; reversión de pago automática — **deuda L5+**.

---

## Preflight (master `6669a3be`)

### REUTILIZADO

- **Catálogo:** `products`, `categories`, RLS lectura pública activos.
- **Carrito:** `cart_items`, `src/app/actions/cart.ts`.
- **Checkout:** `src/app/checkout`, `placeOrder`, flags `TIENDAPRO_CHECKOUT_ENABLED` / `TIENDAPRO_CHECKOUT_PRODUCTION`.
- **Pedidos:** `orders`, `order_items`, estados incl. `paid`; `payments` con `idempotency_key`.
- **Auth:** Supabase Auth + `profiles`, `requireAuth` / `requireAdmin`.
- **Admin:** productos, pedidos, integraciones Gate 3F (`integration_connections`, link sessions).
- **Integraciones:** provider id `meta` en registry (sin Messenger implementado); webhook genérico 501 en `/api/integrations/[provider]/webhook`.
- **Gate 3G (PR #28):** Mercado Pago OAuth en rama separada — **no tocar** desde este track.

### FALTANTE (antes de L1)

- Producto pack digital, `fulfillment_type`, entitlements, recursos Drive server-only.
- Landing `/oferta/pack-150`, área `mis-compras`.
- `handleApprovedOrder` conectado a pago real (L2).
- Messenger webhook, conversaciones, bot (L3–L4).
- Meta App + tokens en Vercel (L4).

### RIESGOS

- Checkout exige **auth + dirección física** (ajuste digital en L2).
- Sin MP en master: cobro real depende de merge Gate 3G.
- Enlace Drive post-autorización sigue siendo copiable por el comprador (aceptado MVP).
- Carrito RLS permisivo histórico — no ampliar en este track.

### PLAN MÍNIMO

| Fase | Entrega |
|------|---------|
| L1 | Migración digital + pack seed + landing + mis-compras + admin recurso Drive |
| L2 | `handleApprovedOrder` + hook pago aprobado (mock admin / MP post-3G) |
| L3 | Webhook Messenger + idempotencia + `RuleBasedResponder` + checkout link |
| L4 | Meta real + flag `TIENDAPRO_FACEBOOK_SALES_ENABLED` |
| L5–L6 | Pago real + primera venta automática |
