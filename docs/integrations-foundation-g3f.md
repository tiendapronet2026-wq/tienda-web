# Gate 3F — Fundación de integraciones + vinculación segura

## Estado

**GATE 3F — GREEN / CLOSED** (2026-10-02)

Commits: `cea09f0` (publishable/secret env), `9e4afe1` (verify/revoke RPC), `8183025` (audit core / confirm regression).

---

## Supabase (cloud)

| Ref | `dnptsudsxrcamtxfiszh` |
|-----|-------------------------|
| Migraciones aplicadas (MCP) | `tiendapro_integrations_verify_admin_g3f`, `tiendapro_integrations_list_rpc_g3f`, `tiendapro_integrations_connection_admin_rpc_g3f`, `tiendapro_integrations_audit_core_g3f` (+ connect/foundation previos) |

**No usar** `.env.local` con ref obsoleta `lwenyboejvwuopsenrwx` — la fuente de verdad es **producción** (`www.tiendapro.net`) y el dashboard del proyecto autorizado.

---

## Variables de entorno (código)

Resolución en `src/lib/supabase/env.ts`:

| Uso | Preferido | Fallback legacy |
|-----|-----------|-----------------|
| Cliente | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Servidor | `SUPABASE_SECRET_KEY` | `SUPABASE_SERVICE_ROLE_KEY` |

`NEXT_PUBLIC_SUPABASE_URL` = `https://dnptsudsxrcamtxfiszh.supabase.co`

Diagnóstico local (sin imprimir secretos): `node scripts/verify-supabase-env-alignment.mjs` (exit `3` = ref obsoleta).

---

## Vercel (`tienda-web`)

| Paso | Resultado |
|------|-----------|
| Auditoría UI env (Production + Preview) | **Bloqueada** — sesión navegador en cuenta sin acceso al equipo (`404` en `tienda-web`). Requiere **un login** en Vercel con la cuenta Tienda Pro (MFA si aplica). CLI local: `Not authorized`. |
| Evidencia indirecta prod | Connect / confirm / cifrado / admin list operativos en `www.tiendapro.net` → runtime alineado al proyecto `dnptsudsxrcamtxfiszh`. |
| `INTEGRATION_CREDENTIALS_KEY` | **Configurada** en runtime prod (confirm OK; credencial cifrada en BD). |
| Migración a `sb_publishable_` / `sb_secret_` en Vercel | **Pendiente de acceso** al dashboard Vercel; código ya compatible. Legacy **no revocado**. |

---

## E2E cloud (2026-10-02, sin service_role local)

| # | Caso | Resultado |
|---|------|-----------|
| 1 | Link session (admin UI) | OK |
| 2 | QR / enlace | OK |
| 3 | Confirm (segundo cliente) | OK |
| 4 | `connected` + listado admin (`list_integration_connections_safe`) | OK |
| 5 | Credencial cifrada en BD | OK (AES-GCM, no plaintext) |
| 6 | Polling modal | OK |
| 7 | Anti-replay confirm | OK (`400`, sin secretos en JSON) |
| 8 | Verificar conexión | OK (`Verificación OK.`) |
| 9 | Desvincular | OK (estado Revocado) |
| 10 | Cancel / expirado | Cubierto por RPC + tests SQL aislados; smoke manual cancel opcional |
| 11 | No-admin | `/admin/integraciones` requiere sesión admin |
| 12 | Logs / respuestas API | Sin `ciphertext`, tokens ni keys en UI/JSON |

---

## Arquitectura connect

- RPC anon: `resolve_integration_link_session_for_connect`, `finalize_integration_link_session`, `store_integration_connection_credential`.
- Admin: `list_integration_connections_safe`, `get_integration_connection_admin`, `touch_integration_connection_verified`, `log_integration_audit_event` (+ `log_integration_audit_event_core` desde finalize).
- **Limitación:** rate-limit confirm **in-memory** (serverless).

---

## Git ↔ Supabase

| Git | Remoto |
|-----|--------|
| `20261003010000` … `20261003020000` | foundation + connect RPC |
| `20261003022000` | verify audit admin |
| `20261003023000` | list connections safe |
| `20261003024000` | get connection + touch verified |
| `20261003025000` | audit core (fix confirm tras 032200) |

---

## Legacy API keys

Anon / `service_role` JWT **siguen activos** en Supabase. No se revocaron. Gate futuro: retirada tras confirmar Vercel en `sb_*` y cero consumidores legacy.

---

## CI

`master` CI GREEN tras pushes `cea09f0`, `9e4afe1`, `8183025`.

---

## Siguiente gate

**Gate 3G** — primer proveedor real (OAuth/Embedded). **No iniciado.**
