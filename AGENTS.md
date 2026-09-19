# TiendaPro — instrucciones para agentes (Cursor Cloud)

Documento principal de reglas persistentes del repositorio **tiendapronet2026-wq/tienda-web**.  
Rama de referencia: **master**. No operar en otros repositorios durante una tarea.

Complemento con activación por contexto: `.cursor/rules/*.mdc` (formato nativo de Cursor).  
Este archivo (`AGENTS.md`) es la fuente de verdad; las reglas `.mdc` resumen secciones críticas.

---

## Visión definitiva de TiendaPro

TiendaPro evoluciona hacia una plataforma única que combina:

1. **Web pública comercial** de servicios digitales.
2. **Showroom** de demostraciones interactivas.
3. **Centro privado** de gestión de clientes y proyectos.
4. **Centro de coordinación** de agentes e informes operativos.
5. **Plataforma base** para desarrollar y administrar futuros proyectos independientes.

El código legado (catálogo, carrito, cotizaciones, costos de impresión, etc.) es **transitorio**: puede sustituirse durante la reconstrucción y **no debe condicionar** módulos, rutas ni esquema definitivos. Priorizar arquitectura modular, multi-proyecto y extensible.

---

## Registro de plataforma (sin secretos)

| Servicio | Identificación | Estado / notas |
|----------|----------------|------------------|
| **GitHub** | `tiendapronet2026-wq/tienda-web`, rama `master` | Repo autorizado único |
| **GitHub Actions** | Workflow `CI` (`.github/workflows/ci.yml`): un job `validate` (lint + build) | Concurrencia solo dentro de este workflow; no cancela Vercel ni migraciones |
| **Supabase (código)** | Ref en `next.config.ts`: **`lwenyboejvwuopsenrwx`** | Migraciones en `supabase/migrations/` — **no ejecutar SQL remoto** hasta MCP/acceso verificado al proyecto TiendaPro |
| **Supabase (MCP agente)** | Org visible incluye **`casa-leon-prod`** | **Prohibido** usar Casa León para TiendaPro |
| **Sitio público** | `NEXT_PUBLIC_SITE_URL` → **`https://www.tiendapro.net`** (`.env.example`) | Redirects de auth |
| **Vercel** | Proyecto: **`tiendapronet2026-wqs-projects` / `tienda-web`** (integración GitHub) | Previews en PR; producción en `master`. **Estado válido**: check GitHub `success` y descripción tipo *Deployment has completed* — no asumir éxito solo por URL pendiente |
| **Cursor Cloud** | Repo `github.com/tiendapronet2026-wq/tienda-web` | `.env.example`; no commitear `.env*` |

Variables (nombres): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`.

---

## A. Reglas generales

- Trabajar de forma autónoma en tareas rutinarias; no pedir confirmaciones repetitivas.
- Permanecer en este repositorio hasta completar la tarea.
- No usar credenciales ni proyectos de otros negocios (p. ej. Casa León).
- Priorizar soluciones simples, mantenibles y tipadas; evitar sobreingeniería y dependencias por comodidad.
- Corregir causas raíz; no simular pruebas, builds ni despliegues.
- Documentar cambios importantes; al cerrar entregas usar la plantilla de informe (final).
- Autorización explícita antes de: irreversibles, costos nuevos, borrado de datos, SQL remoto sin acceso verificado, despliegues de producción no solicitados.

### Política de modelos (agentes)

- **Predeterminado recomendado:** **Composer 2.5** para tareas de este repositorio.
- **Otros modelos** solo cuando el usuario lo **solicite expresamente** en el chat o configuración de la tarea.
- **No cambiar** el modelo de agentes Cloud que **ya están en ejecución** (runs activos).
- La selección efectiva depende de la **configuración de Cursor** (usuario, equipo, run Cloud); estas reglas orientan, no overridean la UI.

### GitHub Actions — ahorro

1. Un pipeline CI mínimo; no crear workflows redundantes.
2. No duplicar lint/build en Cursor Cloud y GitHub en la misma entrega sin motivo.
3. `concurrency` **solo** en el workflow `CI`, por rama — cancelar runs **obsoletos del mismo workflow**, no despliegues Vercel ni jobs de migración en otros sistemas.
4. No suites de prueba repetidas; este repo no exige más que lint + build hasta que existan tests acordados.
5. Timeouts razonables (p. ej. 15 min); sin cron innecesarios.
6. Mantener controles esenciales; no romper checks requeridos del PR.
7. Cerca del límite de minutos: pausar ampliaciones de CI y pedir autorización.

### Vercel — ahorro

1. Proyecto TiendaPro: **`tienda-web`** bajo el equipo Vercel vinculado al org GitHub (ver tabla arriba).
2. Confirmar proyecto en dashboard antes de cambiar settings o `vercel.json`.
3. Previews en PR; producción al integrar en `master` — agrupar commits por entrega; no forzar redeploys.
4. Verificar **estado real** del deployment (Ready / completed), no solo enlace generado.
5. No desactivar protecciones de producción; cerca del límite de builds, informar y evitar previews extra.

### Supabase

- Proyecto TiendaPro: ref **`lwenyboejvwuopsenrwx`** (código). **Sin SQL remoto** hasta acceso MCP/dashboard verificado al proyecto correcto.
- **No usar** `casa-leon-prod` ni credenciales ajenas.
- Migraciones versionadas; RLS y permisos mínimos; sin `service_role` en cliente.
- Multi-tenant futuro: aislar datos por cliente/proyecto.

### Cursor Cloud

- Paralelismo solo en tareas independientes; no editar los mismos archivos a la vez.
- Entregas coherentes; reutilizar informes verificados; sin bucles ni pruebas pesadas innecesarias.

### Diseño (UI)

- Premium, moderno, profesional; mobile-first; tipografía legible; navegación simple; componentes reutilizables; evitar UI saturada.

---

## B. Reglas específicas de TiendaPro

### Stack actual (transitorio hacia la visión)

- **Next.js 15** (App Router), **React 19**, **Tailwind CSS 4**, **Supabase**.
- Código existente en `src/` y `supabase/` sirve de base operativa hasta la reconstrucción modular.
- Nuevos módulos alineados a la visión: áreas públicas (servicios, showroom), área privada (clientes, proyectos, agentes/informes), núcleo multi-proyecto.

### Arquitectura objetivo (orientación)

- Separar **público** / **privado** / **operaciones agentes** / **proyectos hijos** en límites claros (rutas, RLS, tenants).
- Informes de agentes: formato estándar (plantilla al final); almacenamiento y dashboard en fases posteriores.
- Legacy (carrito, cotizaciones clásicas, cost engine de impresión): no expandir salvo hotfix; preferir reemplazo planificado.

### Seguridad

- `createAdminClient()` solo en servidor; nunca en cliente.
- Sin secretos en frontend; revisar RLS en cada migración nueva.

### Despliegue local / CI

- `npm run dev` | `npm run build` | `npm run lint`.
- CI usa env placeholder solo para compilar; producción en Vercel con secrets del proyecto **`tienda-web`**.

---

## C. Reglas futuras — chatbots (no activar integraciones)

Arquitectura **modular**; sin WhatsApp, Instagram ni APIs externas hasta autorización.

Capas: **interpretación** (LLM) → **validación** → **motor de reglas** → **herramientas autorizadas** → **auditoría**.

El LLM no decide permisos ni ejecuta operaciones directas en producción.

Stubs futuros sugeridos: `src/lib/chatbot/` (vacío hasta tarea explícita).

---

## Plantilla de informe (copiar al cerrar entregas)

```
PROYECTO: TiendaPro / tienda-web
OBJETIVO:
CAMBIOS:
PR / COMMIT:
VALIDACIONES:
GITHUB ACTIONS:
VERCEL:
SUPABASE:
ESTADO DE PRODUCCIÓN:
BLOQUEOS:
PRÓXIMO PASO:
```

No incluir secretos, tokens ni datos personales de clientes.

---

## Historial de configuración

- **2026-09-19**: Creación inicial `AGENTS.md`, `.cursor/rules/`, CI mínimo (PR #1).
- **2026-09-19**: Visión definitiva plataforma, política de modelos, registro Vercel verificado, aclaración legacy vs reconstrucción.
