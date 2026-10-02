# Gate 3F — Fundación de integraciones + vinculación segura

## Estado

**GATE 3F — GREEN / CLOSED** (2026-10-02)

PR [#27](https://github.com/tiendapronet2026-wq/tienda-web/pull/27) mergeado en `master`.

**Requisito deploy:** configurar `INTEGRATION_CREDENTIALS_KEY` (≥32 chars) en Vercel Production/Preview para completar vinculaciones con credenciales cifradas.

---

## Preflight

### REUTILIZADO

`is_admin()` / RLS; `requireAdmin()`; `createAdminClient()`; patrón secretos servidor (`BRIDGE_API_SECRET`); checkout / Gate 3E sin cambios.

### FALTANTE (entregado)

Modelo integraciones + link sessions + auditoría + cifrado + UI `/admin/integraciones` + `/connect/<token>` + adapter + piloto `link_demo`.

### RIESGOS

Sin `INTEGRATION_CREDENTIALS_KEY`, confirm falla al persistir credenciales. Rate-limit confirm in-memory (suficiente 3F).

### MODELO

Conexión (metadata) · credenciales cifradas (solo service role) · sesión QR (hash SHA-256, 5 min) · eventos audit append-only.

---

## Piloto

`link_demo` — laboratorio interno. WhatsApp / Mercado Pago: **Próximamente** (sin flujo engañoso).

---

## Git ↔ Supabase

| Git | Remoto |
|-----|--------|
| `20261003010000_tiendapro_integrations_foundation_g3f.sql` | `tiendapro_integrations_foundation_g3f` + `g3f_core` / `g3f_rpc2` / `g3f_rpc3` (apply remoto en pasos) |

---

## Siguiente gate

**Gate 3G** — primer proveedor real (OAuth/Embedded). **No iniciado.**
