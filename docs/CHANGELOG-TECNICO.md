# CHANGELOG técnico — Tienda Pro (`tienda-web`)

Bitácora de cambios sustantivos (ALQUIMIA). Las entradas **verificadas en producción** requieren aprobación humana explícita.

---

## 2026-10-09 — WhatsApp ventas + atribución checkout (rama `feat/tiendapro-whatsapp-mp-launch`)

**Problema:** Prioridad comercial de vender el pack por WhatsApp con el mismo motor que Messenger; cerrar circuito pago → estado `purchased` en conversación.

**Dependencias:** Launch L3 Messenger, Gate 3H (PR #31), `RuleBasedResponder`, `handleApprovedOrder`.

**Implementado:**

- Canal `whatsapp_business` en `sales_conversations` (migración `20261009183000`).
- `WhatsAppCloudProvider`, parser webhook, ruta `/api/integrations/meta/whatsapp/webhook`.
- Flag `TIENDAPRO_WHATSAPP_SALES_ENABLED`.
- Atribución: cookies en landing + marcador `[SALES_ATTRIBUTION]` en pedido → `syncSalesConversationPurchase` tras entitlement.
- Admin `/admin/ventas-whatsapp`.
- Docs: `launch-track-whatsapp-digital-pack.md`, `digital-pack-go-live-checklist.md`.

**Pruebas:** Vitest — parsers WhatsApp, checkout-attribution, suite completa local.

**Pendiente / no verificado:**

- E2E Preview: WhatsApp real → MP → Mis compras.
- Cobro real ARS 1.000 (requiere autorización).
- Merge PR #31 + esta rama; deploy Production con flags.

**Riesgos:** Costos conversación WhatsApp; OAuth MP `write`; pack aún `is_active=false` en prod.

---

## 2026-10-05 — Gate 3H Mercado Pago Orders (PR #31, abierto)

Ver `docs/integrations-mercadopago-g3h.md`. Migraciones aplicadas en Supabase prod; código en revisión previa a merge.
