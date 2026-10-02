# Gate 3F — Fundación de integraciones + vinculación segura

## Estado

**GATE 3F — GREEN / CLOSED** (2026-10-02)

PR [#27](https://github.com/tiendapronet2026-wq/tienda-web/pull/27) + fixes en `master` (`b4ba56b` connect RPC, `67c8334` admin read).

---

## ENV / cifrado

- `INTEGRATION_CREDENTIALS_KEY` configurada manualmente en Vercel (Production + Preview) — **sin revelar valor**.
- Confirm producción OK con credencial AES-GCM almacenada (no plaintext en BD).

---

## E2E producción (smoke)

| Paso | Resultado |
|------|-----------|
| `/connect/<token>` válido | OK — pantalla «Vincular a Tienda Pro» |
| `POST /api/integrations/connect/confirm` | OK `200` — `connectionId` sin secretos en JSON |
| Anti-replay | OK `400` — «ya fue utilizado» |
| Sesión `completed` + `used_at` | OK |
| Cifrado | OK — `ciphertext` no contiene JSON demo en claro |
| `/admin/integraciones` | OK tras grants + deploy |
| Revoke / cleanup SQL | Conexiones `link_demo` revocadas post-smoke |

---

## Arquitectura connect

- RPC `resolve_integration_link_session_for_connect` + `finalize` / `store_integration_connection_credential` vía cliente **anon** (hash one-time; no depende de `SUPABASE_SERVICE_ROLE_KEY` alineado).
- **Limitación conocida:** rate-limit del confirm es **in-memory** (no distribuido en serverless). Deuda antes de integraciones reales de alto riesgo.

---

## Git ↔ Supabase

| Git | Remoto |
|-----|--------|
| `20261003010000_tiendapro_integrations_foundation_g3f.sql` | foundation + RPCs |
| `20261003013000_tiendapro_integrations_pgrst_reload_g3f.sql` | reload schema |
| `20261003020000_tiendapro_integrations_connect_rpc_g3f.sql` | connect RPC |
| `20261003021000_tiendapro_integrations_grants_g3f.sql` | grants authenticated |

---

## Piloto

`link_demo` — laboratorio. WhatsApp / Mercado Pago: **Próximamente**.

---

## Siguiente gate

**Gate 3G** — primer proveedor real (OAuth/Embedded). **No iniciado.**
