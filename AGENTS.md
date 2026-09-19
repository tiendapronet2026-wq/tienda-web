# TiendaPro — instrucciones para agentes (Cursor Cloud)

Documento principal de reglas persistentes del repositorio **tiendapronet2026-wq/tienda-web**.  
Rama de referencia: **master**. No operar en otros repositorios durante una tarea.

Complemento opcional con activación por contexto: `.cursor/rules/*.mdc` (formato nativo de Cursor).  
Este archivo (`AGENTS.md`) es la fuente de verdad; las reglas `.mdc` resumen y acotan secciones críticas.

---

## Registro de plataforma (sin secretos)

| Servicio | Identificación | Estado / notas |
|----------|----------------|------------------|
| **GitHub** | `tiendapronet2026-wq/tienda-web`, rama `master` | Repo autorizado único para TiendaPro web |
| **Supabase (código)** | Host de imágenes/API en `next.config.ts`: proyecto ref **`lwenyboejvwuopsenrwx`** | Migraciones versionadas en `supabase/migrations/` |
| **Supabase (MCP agente)** | Org visible: `sistemacasaleon-sketch's Org`; proyecto listado: **`casa-leon-prod`** (`emmlctfoxtuspxaanugg`) | **No usar** `casa-leon-prod` para TiendaPro. Conectar MCP al proyecto TiendaPro correcto antes de SQL/migraciones remotas |
| **Sitio público** | `NEXT_PUBLIC_SITE_URL` → producción esperada **`https://www.tiendapro.net`** (ver `.env.example`) | Auth redirects dependen de esta URL |
| **Vercel** | Proyecto ligado al mismo repo (confirmar nombre en dashboard Vercel del equipo TiendaPro) | Sin `vercel.json` en repo; `.vercel/` ignorado en git |
| **Cursor Cloud** | Entorno personal, repo `github.com/tiendapronet2026-wq/tienda-web` | Variables locales: usar `.env.example`; no commitear `.env*` |
| **GitHub Actions** | Sin workflows previos a la configuración inicial | CI mínimo: lint + build; concurrencia con cancelación de runs obsoletos en PR |

Variables requeridas (nombres únicamente): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`.

---

## A. Reglas generales

- Trabajar de forma autónoma en tareas rutinarias; no pedir confirmaciones repetitivas.
- Permanecer en este repositorio hasta completar la tarea.
- No usar credenciales, proyectos Supabase ni tokens de otros negocios (p. ej. Casa León).
- Priorizar soluciones simples, mantenibles y tipadas; código modular acorde al estilo existente.
- No agregar dependencias por comodidad; evitar sobreingeniería.
- Corregir causas raíz, no solo síntomas.
- No simular resultados de pruebas, builds ni despliegues; ejecutar comandos reales y reportar salida.
- Documentar cambios importantes en commits y, al cerrar entregas, usar la plantilla de informe (final de este archivo).
- Pedir autorización explícita antes de: operaciones irreversibles, costos nuevos, borrado de datos/estructuras, despliegues de producción no solicitados o cambios en datos reales de clientes.

### GitHub Actions — ahorro

1. Revisar workflows existentes antes de añadir otros; no duplicar pipelines.
2. No ejecutar suites completas por cada cambio mínimo; agrupar entregas coherentes.
3. Mantener CI mínimo (lint + build cuando aplique); timeouts razonables (p. ej. 15 min).
4. Usar `concurrency` por workflow y rama para cancelar validaciones obsoletas cuando sea seguro.
5. No cancelar jobs de despliegue a producción ni migraciones en curso.
6. Evitar ejecutar a la vez la misma validación pesada en Cursor Cloud y en GitHub sin motivo.
7. No crear cron jobs innecesarios.
8. No omitir controles obligatorios ni dejar PRs bloqueados por filtros rotos.
9. Si el consumo de minutos/actions está bajo o cerca del límite, detener runs no esenciales y pedir autorización antes de ampliar CI.

### Vercel — ahorro

1. Usar solo el proyecto Vercel de TiendaPro (verificar en dashboard antes de cambiar settings).
2. Conocer plan y límites reales del equipo antes de forzar builds.
3. No crear preview por cada commit; agrupar cambios por entrega.
4. Usar `[skip ci]` / omitir build solo cuando el proyecto lo soporte y no se pierdan controles necesarios.
5. No redeploy forzado sin justificación; aprovechar caché de dependencias.
6. Evitar builds simultáneos redundantes; una validación de despliegue por entrega consolidada suele bastar.
7. No desactivar protecciones de producción.
8. Cerca del límite de consumo: informar y pausar despliegues no esenciales.

### Supabase

- Confirmar proyecto **TiendaPro** (`lwenyboejvwuopsenrwx` en código) antes de cualquier operación remota.
- Migraciones versionadas en `supabase/migrations/`; no aplicar cambios ad hoc en producción sin migración.
- RLS y permisos mínimos; no exponer `service_role` en el frontend.
- Evitar polling y consultas excesivas.
- No borrar tablas/datos sin respaldo y autorización.
- Diseñar multi-tenant futuro: datos de clientes aislados por proyecto/cuenta.

### Cursor Cloud

- Agentes paralelos solo para trabajo independiente; evitar editar los mismos archivos a la vez.
- Preferir una entrega completa a muchos micro-PRs.
- No repetir diagnósticos ya resueltos; reutilizar informes verificados.
- No ejecutar bucles ni pruebas pesadas sin objetivo claro.

### Diseño (UI)

- Premium, moderno, profesional; mobile-first y responsive.
- Tipografía grande y legible; navegación simple, pocos clics.
- Componentes reutilizables en `src/components/`; evitar tarjetas anidadas y UI saturada.

---

## B. Reglas específicas de TiendaPro

### Stack y convenciones

- **Next.js 15** (App Router), **React 19**, **Tailwind CSS 4**, **Supabase** (`@supabase/ssr`, `@supabase/supabase-js`).
- Server Actions en `src/app/actions/` y `src/app/admin/actions/`; cliente Supabase server en `src/lib/supabase/`.
- Admin bajo `src/app/admin/` (protegido por middleware/sesión); catálogo, cotizaciones, costos, proveedores, materiales.
- Motor de costos: `src/lib/cost-engine.ts`, documentación en `docs/cost-engine.md`.
- Tipos de BD: `src/types/database.ts` (regenerar cuando cambie el esquema con herramientas Supabase autorizadas).

### Alcance de producto

- Plataforma comercial TiendaPro (catálogo, carrito, cotizaciones, cuenta, panel admin).
- No reconstruir toda la web en tareas de configuración o mantenimiento puntual.
- Banner beta y copy existentes respetan la identidad TiendaPro.

### Seguridad

- Operaciones administrativas sensibles: `createAdminClient()` solo en servidor; nunca en componentes cliente.
- Revisar políticas RLS en migraciones existentes antes de ampliar tablas públicas.
- Imágenes de producto: bucket/config en migraciones `storage_product_images`; URLs remotas rotas mapeadas en `src/lib/product-image.ts`.

### Despliegue local / CI

- Scripts: `npm run dev`, `npm run build`, `npm run lint`.
- Build en CI puede usar URLs/keys placeholder solo para compilar; producción usa secrets en Vercel/hosting.

---

## C. Reglas futuras — chatbots (no activar integraciones)

Arquitectura objetivo **modular**; sin WhatsApp, Instagram ni APIs externas hasta tarea autorizada.

Capas separadas:

1. **Interpretación** — LLM traduce intención del usuario a intenciones estructuradas (sin ejecutar).
2. **Validación** — Comprueba permisos, tenant y datos de entrada.
3. **Motor de reglas** — Decide qué acciones están permitidas (negocio TiendaPro).
4. **Herramientas autorizadas** — Ejecutores acotados (consultas, crear cotización, etc.) invocados solo tras validación.
5. **Auditoría** — Registro de decisiones y acciones (similar espíritu a `cost_audit_log`).

El LLM **no** decide permisos ni ejecuta operaciones directamente sobre producción.

Implementación futura sugerida: módulos bajo algo como `src/lib/chatbot/` (vacío o stubs hasta autorización).

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

- **2026-09-19**: Creación de `AGENTS.md`, reglas `.cursor/rules/` y CI mínimo inicial.
