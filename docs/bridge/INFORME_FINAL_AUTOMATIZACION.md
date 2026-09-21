# Informe final — automatización puente TiendaPro 3.0

**Repositorio:** [tiendapronet2026-wq/tienda-web](https://github.com/tiendapronet2026-wq/tienda-web)  
**Alcance:** TiendaPro (`dnptsudsxrcamtxfiszh`, `www.tiendapro.net`) — sin Casa León, Pulso ni otros proyectos.  
**Objetivo:** circuito **ChatGPT → TiendaPro → Cursor → informe consultable desde ChatGPT**, sin copiar/pegar instrucciones manuales en cada paso.

> Este documento está pensado para que un **Custom GPT** (plan **Plus**) lo lea vía URL pública de GitHub o como conocimiento adjunto.

---

## 1. Viabilidad real (investigación)

### 1.1 ¿GitHub como intermediario?

| Enfoque | Viabilidad | Estado en tienda-web |
|--------|------------|----------------------|
| **A. ChatGPT → API Bridge → BD → issue GitHub al despachar → Cursor lee issue → POST resultado API** | **Alta** | **Implementado (v1)**. Despacho crea issue con labels `bridge-task`, `tiendapro` si hay `GITHUB_BRIDGE_TOKEN` o `INSTALLER_GITHUB_TOKEN`. |
| **B. ChatGPT crea issue GitHub directo (sin Bridge)** | Media | **No implementado**. Haría falta sincronizar issue → tarea Control y permisos OAuth/PAT en el GPT. |
| **C. Cursor API paga como ejecutor automático** | Bloqueado por política | **No activado** (`CURSOR_API_KEY` no usado). |

**Conclusión:** el circuito viable es **A**. GitHub es **cola visible para Cursor** (Cloud Agent o humano en el repo), no el único canal de entrada. La entrada sin copiar/pegar para ChatGPT es la **REST Bridge API** + esquema OpenAPI.

### 1.2 Cursor

- **Cursor Cloud / agente en repo:** compatible con issues en `tiendapronet2026-wq/tienda-web` (mismo flujo que cualquier tarea GitHub). **Coste:** según plan Cursor del usuario; **no** se invoca la API comercial de Cursor desde TiendaPro.
- **Registro de resultado:** `POST /api/bridge/v1/tasks/{id}/result` con Bearer (resultado **no verificado** en servidor: tests `skipped`, `testsVerified: false`).

### 1.3 ChatGPT Plus (no Business)

- **Custom GPT + Actions (OpenAPI):** disponible en **Plus** para llamadas HTTP a un dominio propio con **API Key / Bearer**.
- **No requiere** ChatGPT Business si el GPT usa Actions hacia `https://www.tiendapro.net` y el usuario configura una vez el secret como clave de API.
- **Limitación Plus:** no hay “Actions de equipo” centralizadas; cada usuario/GPT guarda la clave. Para TiendaPro basta un GPT del operador.

**OpenAPI publicado:** `https://www.tiendapro.net/bridge/openapi.yaml`  
**Informe (este archivo):**  
`https://github.com/tiendapronet2026-wq/tienda-web/blob/master/docs/bridge/INFORME_FINAL_AUTOMATIZACION.md`

---

## 2. Qué funciona realmente (producción)

**Verificado el 2026-09-21** tras merge PR #13, rotación de `BRIDGE_API_SECRET` (longitud válida) y **un** deploy Production.

| Capacidad | Estado |
|-----------|--------|
| SQL puente en Supabase `dnptsudsxrcamtxfiszh` | Operativo (según operador) |
| `/control/tareas` creación UI | Operativo |
| API `GET/POST /api/bridge/v1/tasks` con Bearer | **Operativo** (401 sin auth, 200 con Bearer válido) |
| Cartel “API bridge: activa” | **Operativo** tras redeploy con secret ≥24 chars |
| OpenAPI público `/bridge/openapi.yaml` | **200 OK** |
| Despacho issue GitHub real | **Pendiente** sin `GITHUB_BRIDGE_TOKEN` en Production |
| Auto-aprobación modo C vía API | **No** (tareas API → `pending_approval`) |
| `circuit_validated` | **false** hasta E2E completo con aprobación owner |
| Cursor API paga | **No activada** |

---

## 3. Qué quedó pendiente

1. **Una acción owner en Control** tras crear tarea desde ChatGPT: **Aprobar** y **Despachar** (hasta validar E2E y decidir subir `circuit_validated`).
2. **`GITHUB_BRIDGE_TOKEN` en Vercel Production** (PAT mínimo: issues en `tiendapronet2026-wq/tienda-web`) para issues reales en lugar de despacho simulado.
3. **Sincronizar secret con Custom GPT:** la clave Bearer del GPT debe coincidir con `BRIDGE_API_SECRET` (rotación en Vercel implica actualizar el GPT una vez).
4. **E2E completo con Cursor real** en una tarea de prueba (issue → trabajo → `POST .../result` → ChatGPT hace `GET .../tasks/{id}` y lee `result_report`).

---

## 4. Pruebas realizadas

**Comando (2026-09-21, producción `www.tiendapro.net`):**

```bash
BRIDGE_DEMO_BASE_URL=https://www.tiendapro.net BRIDGE_API_SECRET=<desde Vercel Production> node scripts/bridge-verify-production.mjs
```

**Resultado ejecutado por Cursor Cloud Agent (sin imprimir el secret):**

| Prueba | Resultado |
|--------|-----------|
| `GET /api/bridge/v1/tasks` sin auth | **PASS** → HTTP **401** |
| `GET` con Bearer incorrecto | **PASS** → HTTP **401** |
| `GET` con Bearer válido | **PASS** → HTTP **200**, `ok: true` |
| `POST` crear tarea | **PASS** → HTTP **200**, `status: pending_approval` |
| `GET` por id | **PASS** → HTTP **200** |
| `POST .../result` antes de despacho | **PASS** → HTTP **409** |
| `GET /bridge/openapi.yaml` | **PASS** → HTTP **200** |

**Causa raíz del bloqueo previo (503 / cartel inactivo):** el valor de `BRIDGE_API_SECRET` en Vercel **no cumplía** `isBridgeApiConfigured()` (ausente, vacío o **&lt;24 caracteres**). Se **rotó** a un secret de 64 caracteres hex y se redeployó Production **una vez**. No se publica el valor en GitHub ni en este informe.

**No se simuló** ejecución de Cursor ni se declaró E2E PASS del circuito completo (falta aprobar/despachar + trabajo real + `POST .../result` tras despacho).

---

## 5. Estado de producción

- **Dominio:** `www.tiendapro.net` → proyecto Vercel **tienda-web** (equipo tiendapronet2026-wqs-projects).
- **Código:** `master` incluye PR #12 (hardening) + PR #13 (OpenAPI + informe + verify).
- **`BRIDGE_API_SECRET`:** presente en Production; **rotado 2026-09-21** (≥24 chars). La API anónima responde **401** (no 503).
- **Acción requerida tras rotación:** actualizar **una vez** la API Key del Custom GPT para que coincida con el valor actual en Vercel (Settings → Environment Variables → Production → `BRIDGE_API_SECRET` → reveal/copy **solo en tu sesión**, no en chat).

---

## 6. Costos y permisos

| Recurso | Costo | Permiso |
|---------|-------|---------|
| Vercel / Supabase TiendaPro | Plan actual | Sin cambios |
| GitHub PAT `GITHUB_BRIDGE_TOKEN` | Gratis | `issues: write` solo repo `tienda-web` |
| ChatGPT Plus + Custom GPT Actions | Suscripción Plus del usuario | Configurar Action + API key |
| Cursor Cloud Agent | Según plan Cursor | Ejecutar desde issue (no API paga TiendaPro) |

**No se activó** Cursor API comercial ni servicios nuevos de pago.

---

## 7. Cómo enviar la próxima tarea sin copiar y pegar

### Paso único de configuración (una vez)

1. En **Custom GPT** → **Actions** → importar esquema desde  
   `https://www.tiendapro.net/bridge/openapi.yaml`
2. Autenticación: **API Key**, header `Authorization: Bearer <BRIDGE_API_SECRET>`  
   (copiar el valor **solo una vez** desde Vercel → tienda-web → Environment Variables → Production; no compartir en chat).

### Flujo conversacional

1. **ChatGPT** llama `createBridgeTask` con `instruction` (y opcional `title`).
2. Guardar `task_id` de la respuesta.
3. **Owner** en `https://www.tiendapro.net/control/tareas` → Aprobar → Despachar (issue GitHub si hay token).
4. **Cursor** trabaja en el repo / issue; al terminar, agente o script hace `POST /api/bridge/v1/tasks/{id}/result` con Bearer.
5. **ChatGPT** llama `getBridgeTask` y resume `result_report` al usuario.

### Consultar este informe desde ChatGPT

- Adjuntar este archivo al GPT, o  
- Indicar al GPT: “Lee el informe en  
  `https://raw.githubusercontent.com/tiendapronet2026-wq/tienda-web/master/docs/bridge/INFORME_FINAL_AUTOMATIZACION.md`”  
  (con navegación/browse activo).

---

## 8. Bloqueos conocidos (transparencia)

- **Custom GPT desincronizado:** si el GPT guarda el secret anterior, las Actions fallarán con 401 hasta actualizar la clave en el GPT.
- **Despacho simulado:** falta `GITHUB_BRIDGE_TOKEN` en Production (PAT `issues:write` en `tiendapronet2026-wq/tienda-web`).
- **E2E humano/owner:** aprobar y despachar en `/control/tareas` sigue siendo obligatorio antes de que Cursor registre resultado.
- **No se declara E2E PASS** ni `circuit_validated=true` hasta prueba real completa.

---

*Última actualización: 2026-09-21 — PR #13 mergeado, verificación `bridge-verify-production.mjs` PASS en producción.*
