# Checklist — salida a venta pública Pack $29.999

**Bloqueante comercial** — no activar `is_active` del pack ni checkout público sin firmar este checklist (propietario).

## Licencias y contenido

- [ ] Origen legal del material (+150 cursos / bonos) documentado (proveedor, contrato o compra con derechos).
- [ ] Alcance de **reventa / redistribución** alineado con texto de ficha y FAQ (no prometer ingresos).
- [ ] Inventario o índice del contenido entregado (carpeta Drive) revisado vs. lo publicitado.
- [ ] Política de soporte y reembolsos acordada (revocación manual de entitlement si aplica).

## Producto y precio

- [ ] `pack-150-cursos-digitales-bonos` — precio **29.999 ARS** confirmado en admin.
- [ ] Recurso Drive activo en `digital_delivery_resources`.
- [ ] Descripción en `/oferta/pack-150` y respuestas del bot coherentes.

## Pagos (Gate 3H)

- [ ] PR Gate 3H mergeado y desplegado en entorno objetivo.
- [ ] OAuth MP con scope **`write`** + reconexión admin.
- [ ] Webhook Orders + `MERCADOPAGO_WEBHOOK_SECRET` en Vercel (sin exponer valor en chat).
- [ ] Smoke monetario ARS 1.000 **GREEN** en Preview (autorización explícita para cobro real).
- [ ] Flags: `TIENDAPRO_CHECKOUT_*`, `TIENDAPRO_MP_ORDERS_CHECKOUT_ENABLED` según entorno.

## WhatsApp

- [ ] App Meta + número WABA configurados.
- [ ] Webhook WhatsApp verificado en Preview/Production según plan.
- [ ] `TIENDAPRO_WHATSAPP_SALES_ENABLED=1` solo tras prueba conversacional.
- [ ] Costos de mensajería Meta revisados y aceptados.

## Seguridad

- [ ] Sin enlaces públicos permanentes a Drive en catálogo o bot (solo Mis compras + entitlement).
- [ ] Regresión: idempotencia checkout, webhook MP, grant digital.

## Aprobación

- [ ] Fecha / responsable: ___________________
