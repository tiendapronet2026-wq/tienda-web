# Gate 3F — Fundación de integraciones + vinculación segura

## Estado

**EN CURSO** — rama `feat/tiendapro-integrations-foundation-g3f`.

---

## Preflight

### REUTILIZADO

- `is_admin()`, RLS admin, `requireAdmin()`, `createAdminClient()` (service role server-only).
- `BRIDGE_API_SECRET` patrón timing-safe (referencia, no duplicar integraciones).
- Tabla `payments` / `mercadopago` en schema legacy **sin** OAuth activo en app.
- `platform_installations` metadata sin secretos (instalador SaaS, distinto dominio).
- Gate 3E / checkout **sin cambios**.

### FALTANTE (entregado en rama)

- `integration_connections`, `integration_link_sessions`, `integration_connection_credentials`, `integration_audit_events`.
- RPC link/revoke/finalize; QR `/connect/<token>`; admin `/admin/integraciones`.
- Adapter `IntegrationProvider` + piloto `link_demo`.
- Cifrado AES-GCM con `INTEGRATION_CREDENTIALS_KEY`.

### RIESGOS

- Sin `INTEGRATION_CREDENTIALS_KEY` en Vercel, confirmar vinculación falla al guardar credenciales.
- Rate limit en confirm es in-memory (suficiente Gate 3F; Redis en gates futuros si hace falta).

### MODELO PROPUESTO

Conexión (metadata pública) + credenciales cifradas (solo service role) + sesiones one-time (hash SHA-256) + auditoría append-only.

---

## Piloto

`link_demo` — laboratorio sin proveedor externo. WhatsApp / Mercado Pago: tarjetas **Próximamente** (sin flujo falso).

---

## Git ↔ Supabase

| Git | Remoto (pendiente apply) |
|-----|--------------------------|
| `20261003010000_tiendapro_integrations_foundation_g3f.sql` | `tiendapro_integrations_foundation_g3f` |

---

## Siguiente gate

**3G** — primer proveedor real (OAuth/Embedded) sobre esta fundación. **No iniciado.**
