# Launch Track — WhatsApp + Pack digital

## Estado

| Ítem | Estado |
|------|--------|
| L3-WA código | **Implementado** en rama `feat/tiendapro-whatsapp-mp-launch` |
| Webhook | `GET/POST /api/integrations/meta/whatsapp/webhook` |
| Bot | Reutiliza `RuleBasedResponder` + `handleIncomingMessengerMessages` |
| Provider | `WhatsAppCloudProvider` (Graph API Cloud) |
| Admin | `/admin/ventas-whatsapp` |
| Flag | `TIENDAPRO_WHATSAPP_SALES_ENABLED=1` |
| Meta real + número WABA | **Pendiente humano** — no activar sin autorización |

## Reutilizado (no duplicar)

- Catálogo: `loadPack150Catalog`
- Checkout / MP / entitlements: Launch L1–L2 + Gate 3H
- Conversaciones: tablas `sales_conversations` / `sales_messages` (canal `whatsapp_business`)
- Tracking: `?src=whatsapp_business&cid=<tracking_token>`

## Configuración Meta (resumen)

1. App en [Meta for Developers](https://developers.facebook.com/) con producto **WhatsApp**.
2. Número de prueba o producción vinculado al WABA.
3. Webhook URL: `https://www.tiendapro.net/api/integrations/meta/whatsapp/webhook`
4. Verify token: valor de `WHATSAPP_VERIFY_TOKEN` (o `META_VERIFY_TOKEN` compartido).
5. Suscribir campo **messages** del WABA.
6. Variables Vercel (solo servidor): `META_APP_SECRET`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_VERIFY_TOKEN`, `TIENDAPRO_WHATSAPP_SALES_ENABLED=1`.

## Costos (informar antes de activar)

- **WhatsApp Cloud API:** ventana de servicio gratuita limitada; conversaciones de marketing/utilidad pueden tener cargo según país y categoría ([precios Meta](https://developers.facebook.com/docs/whatsapp/pricing)).
- **Mercado Pago:** comisión por transacción acreditada.
- **Infra:** Vercel + Supabase existentes — sin servicio nuevo obligatorio.

## Plantillas

Mensajes del bot son **respuestas dentro de la ventana de 24 h** tras mensaje del usuario (session messages). Para iniciar conversación sin inbound previo hacen falta **plantillas aprobadas** — no implementadas en este gate.

## Pruebas recomendadas (Preview)

1. Webhook verify (GET) con token correcto.
2. POST firmado con payload de prueba Meta → respuesta del bot.
3. Link trazable → landing → cookie → checkout → notas `[SALES_ATTRIBUTION]`.
4. Pago acreditado (smoke MP) → `purchased` en conversación + Mis compras.

No declarar GREEN hasta E2E WhatsApp → pago → entrega en Preview.
