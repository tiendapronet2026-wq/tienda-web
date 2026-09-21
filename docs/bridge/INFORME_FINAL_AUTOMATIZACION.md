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

<!-- EVIDENCE_SECTION: actualizar tras verificación automatizada -->

| Capacidad | Estado |
|-----------|--------|
| SQL puente en Supabase `dnptsudsxrcamtxfiszh` | Operativo (según operador) |
| `/control/tareas` creación UI | Operativo |
| API `GET/POST /api/bridge/v1/tasks` con Bearer | Ver sección **Pruebas** y **Estado producción** |
| Cartel “API bridge: activa” | Depende de `BRIDGE_API_SECRET` válido (≥24 chars) en runtime |
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

<!-- EVIDENCE_SECTION -->

Script: `node scripts/bridge-verify-production.mjs` con `BRIDGE_DEMO_BASE_URL=https://www.tiendapro.net`.

| Prueba | Resultado esperado |
|--------|-------------------|
| `GET /api/bridge/v1/tasks` sin auth | **401** |
| `GET` con Bearer incorrecto | **401** |
| `GET` con Bearer válido | **200**, `ok: true` |
| `POST` crear tarea | **200**, `status: pending_approval` |
| `GET` por id | **200**, historial |
| `POST .../result` antes de despacho | **409** (no sustituye aprobación) |
| `GET /bridge/openapi.yaml` | **200** |

*(Los resultados PASS/FAIL concretos se registran en el commit que ejecuta la verificación post-deploy.)*

---

## 5. Estado de producción

- **Dominio:** `www.tiendapro.net` → proyecto Vercel **tienda-web** (equipo tiendapronet2026-wqs-projects).
- **Código puente:** merge PR #12+ (hardening) en `master`.
- **`BRIDGE_API_SECRET`:** variable Production en Vercel; debe cumplir **≥24 caracteres**. Si la API responde **503** con `config_status: too_short` o `missing`, corregir valor y **Redeploy Production** (un solo redeploy agrupado tras cambios).

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

- **503 Bridge API:** secret ausente o &lt;24 chars en runtime → rotar en Vercel y redeploy.
- **Despacho simulado:** falta `GITHUB_BRIDGE_TOKEN` en Production.
- **No se declara E2E PASS** ni `circuit_validated=true` hasta prueba real con aprobación owner y resultado verificado en panel.

---

*Última actualización: generado en el commit de automatización del puente (Cursor Cloud Agent).*
